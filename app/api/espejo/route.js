import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Instrucciones permanentes para conservar el tono y la honestidad del asesor.
const systemPrompt = `Actúa como un estilista personal experto, conversacional, honesto y con sarcasmo amigable. Comprende el contexto y mantén continuidad con el historial.

El usuario tiene colores favoritos, pero si no favorecen según la foto o no armonizan con el conjunto, díselo con sarcasmo amigable y humor sobre la elección de color. Por ejemplo: "Sé que amas el amarillo, pero hoy está compitiendo demasiado; probemos este azul". No halagues automáticamente: sé honesto, divertido y ofrece una alternativa concreta. Nunca ridiculices el tono de piel, el cuerpo ni los rasgos de la persona.

Personaliza cada respuesta con su nombre, estilo, ocasión, clima, colores favoritos y la foto actual. Responde en español, de forma cálida y breve.`;

const modelos = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, userProfile, contexto, imagen } = body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Falta el mensaje para el espejo." }, { status: 400 });
    }

    const perfil = {
      nombre: typeof userProfile?.nombre === "string" ? userProfile.nombre : "",
      coloresFavoritos: Array.isArray(userProfile?.coloresFavoritos)
        ? userProfile.coloresFavoritos.filter((color) => typeof color === "string")
        : [],
      estilo: typeof userProfile?.estilo === "string" ? userProfile.estilo : "",
      historial: Array.isArray(userProfile?.historial)
        ? userProfile.historial
            .filter(
              (mensaje) =>
                mensaje &&
                ["user", "assistant"].includes(mensaje.role) &&
                typeof mensaje.content === "string",
            )
            .slice(-24)
        : [],
    };
    const conversacion = perfil.historial
      .map((mensaje) => `${mensaje.role === "user" ? perfil.nombre || "Usuario" : "Espejo"}: ${mensaje.content}`)
      .join("\n");
    const instrucciones = `Perfil que debes recordar:
${JSON.stringify({
      nombre: perfil.nombre,
      coloresFavoritos: perfil.coloresFavoritos,
      estilo: perfil.estilo,
    })}

Datos de hoy:
${JSON.stringify({
      ocasion: typeof contexto?.ocasion === "string" ? contexto.ocasion : "",
      clima: typeof contexto?.clima === "string" ? contexto.clima : "",
    })}

Historial reciente:
${conversacion || "Esta es la primera recomendación."}

Mensaje actual:
${prompt.trim()}`;

    const contenidos = [instrucciones];
    if (typeof imagen === "string" && imagen.trim()) {
      const base64 = imagen.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      contenidos.push({
        inlineData: { data: base64, mimeType: "image/jpeg" },
      });
    }

    let ultimoError;
    for (let indice = 0; indice < modelos.length; indice += 1) {
      try {
        const respuesta = await ai.models.generateContent({
          model: modelos[indice],
          contents: contenidos,
          config: { systemInstruction: systemPrompt },
        });

        if (!respuesta.text) {
          throw new Error("Gemini devolvió una respuesta vacía.");
        }

        return NextResponse.json({ text: respuesta.text });
      } catch (error) {
        ultimoError = error;
        console.warn(`Falló el modelo ${modelos[indice]}: ${error.message}`);
        if (indice < modelos.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }
    }

    throw ultimoError || new Error("No hay modelos disponibles.");
  } catch (error) {
    console.error("Error en el endpoint del espejo:", error.message);
    return NextResponse.json(
      { error: "El espejo no pudo responder. Inténtalo de nuevo en unos segundos." },
      { status: 500 },
    );
  }
}
