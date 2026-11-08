import "dotenv/config";
import app from "./app.js";

// Entrada para rodar como servidor comum (npm run dev / npm start / Docker).
// Em produção na Vercel este arquivo NÃO é usado: o vercel.json aponta direto
// para app.js, que exporta o app Express como função serverless.

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port: ${port}`));