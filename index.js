const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// In-memory quote storage (resets on server restart)
const sessionQuotes = {}; // Format: { sessionId: quoteObject }

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = body.session || "default-session";
    const intent = body.queryResult?.intent?.displayName || "";
    const parameters = body.queryResult?.parameters || {};

    const products = {
      bike: { min: 800, max: 1200, rate: 0.1, maxDep: 0.5 },
      car: { min: 1800, max: 2500, rate: 0.12, maxDep: 0.6 },
      mobile: { min: 400, max: 700, rate: 0.2, maxDep: 0.7 },
      laptop: { min: 700, max: 1100, rate: 0.15, maxDep: 0.6 },
      health: { min: 2800, max: 3500, rate: 0.05, maxDep: 0.25 },
      travel: { min: 1000, max: 1500, rate: 0.02, maxDep: 0.1 },
      home: { min: 2200, max: 3000, rate: 0.04, maxDep: 0.2 },
      pet: { min: 800, max: 1000, rate: 0.06, maxDep: 0.3 },
    };

    let responseText = "Sorry, I couldn't understand your request.";

    // Intent 1: GenerateQuote
    if (intent === "GenerateQuote") {
      const { assetType, assetAge = 0 } = parameters;

      if (!assetType || !products[assetType]) {
        responseText = `Invalid or missing asset type. Please provide one of the following: ${Object.keys(
          products
        ).join(", ")}.`;
      } else {
        const config = products[assetType];
        const base =
          Math.floor(Math.random() * (config.max - config.min + 1)) +
          config.min;
        const safeAge = Number(assetAge) || 0;
        const depreciation = Math.min(safeAge * config.rate, config.maxDep);
        const premium = Math.round(base * (1 - depreciation));
        const coverageAmount = premium * (Math.floor(Math.random() * 10) + 10);
        const quoteId = `INSQ${Math.floor(Math.random() * 1000000)}`;
        const validTill = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();

        const quote = {
          quoteId,
          assetType,
          assetAge: safeAge,
          premium,
          coverageAmount,
          currency: "INR",
          validTill,
          quotation_details: `Thanks for reaching out! Your ${assetType} insurance quote is ready — the premium is INR ${premium}, and you're covered for up to INR ${coverageAmount}.`,
        };

        sessionQuotes[sessionId] = quote;

        return res.json({
          fulfillmentText: quote.quotation_details,
          ...quote,
        });
      }
    }

    // Follow-up intents
    const lastQuote = sessionQuotes[sessionId];

    if (!lastQuote) {
      responseText =
        "I couldn’t find your recent quote. Please request a new one.";
    } else {
      switch (intent) {
        case "GetQuoteId":
          responseText = `Your quote ID is ${lastQuote.quoteId}.`;
          break;
        case "GetAssetType":
          responseText = `This quote is for a ${lastQuote.assetType}.`;
          break;
        case "GetPremium":
          responseText = `The premium for your ${lastQuote.assetType} is INR ${lastQuote.premium}.`;
          break;
        case "GetCoverage":
          responseText = `You're covered for up to INR ${lastQuote.coverageAmount}.`;
          break;
        case "GetValidity":
          responseText = `Your quote is valid till ${new Date(
            lastQuote.validTill
          ).toLocaleString("en-IN")}.`;
          break;
        default:
          responseText =
            "Sorry, I didn't understand that. Try asking for your quote ID or premium.";
      }
    }

    return res.json({
      fulfillmentText: responseText,
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.json({
      fulfillmentText: "Oops! Something went wrong on the server.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Dialogflow Webhook running on http://localhost:${PORT}/webhook`);
});
