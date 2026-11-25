import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { prompt, imagen } = await request.json();

    const contents = [prompt];
    if (imagen) {
      contents.push({
        inlineData: { data: imagen, mimeType: "image/jpeg" },
      });
    }

    // Intentamos primero con 3.8-flash, si falla usamos el lite
    const modelos = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    let ultimoError = null;

    for (const modelo of modelos) {
      try {
        console.log(`--> Intentando con: ${modelo}...`);
        const response = await ai.models.generateContent({
          model: modelo,
          contents: contents,
        });
        
        console.log(`--> ¡Éxito con ${modelo}!`);
        return NextResponse.json({ text: response.text });
        
      } catch (error) {
        console.warn(`--> Falló ${modelo}: ${error.message}`);
        ultimoError = error;
        // Esperar 1 segundo antes de intentar el siguiente modelo
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw ultimoError; // Si ambos fallan, lanzamos el error

  } catch (error) {
    console.error("--> ERROR FINAL:", error.message);
    return NextResponse.json(
      { error: "El espejo está muy ocupado. Espera 10 segundos y vuelve a intentar." },
      { status: 500 }
    );
  }
}