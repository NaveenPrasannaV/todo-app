import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors()); // allow frontend requests
app.use(bodyParser.json());

const OPENAI_API_KEY = "your_api_key_here";

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "Sorry, no response.";
        res.json({ reply });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: "Error talking to AI" });
    }
});

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
