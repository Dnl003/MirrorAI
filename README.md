
# MirrorAI: Tu Asesor de Estilo Personal 🪞👗

**MirrorAI** es una aplicación web interactiva que utiliza la visión artificial y el procesamiento de lenguaje natural de **Google Gemini** para actuar como tu estilista personal. 

A través de la cámara web, el espejo analiza tu atuendo, te da consejos de moda personalizados (con un toque de humor) y te responde en voz alta. También puedes hablarle usando el micrófono para pedirle consejos específicos.

## 🛠️ Tecnologías Utilizadas
- **Framework:** Next.js (App Router)
- **Estilos:** Tailwind CSS
- **IA:** Google Gemini (vía `@google/genai`)
- **APIs del Navegador:** WebRTC (Cámara), Web Speech API (Micrófono), SpeechSynthesis (Voz)

## 🚀 Cómo ejecutar este proyecto localmente

Para probar este proyecto en tu propia máquina, sigue estos pasos:

1. **Clona el repositorio**
- *Debes tener intalado Git en tu computadora y tu cuenta de GitHub*
- git clone https://github.com/Dnl003/MirrorAI.git (copia y pega)

2. **Instala las dependencias**:

- npm install

3. **Configura tu API Key de Gemini:**

- Crea un archivo en la raíz del proyecto llamado exactamente "**.env.local**"

- Dentro de ese archivo, agrega la siguiente línea con tu propia clave de Google AI Studio:

GEMINI_API_KEY=tu_clave_de_api_aqui
(Puedes obtener una clave gratuita en Google AI Studio https://aistudio.google.com/api-keys).

4. Inicia el servidor de desarrollo:

- npm run dev

Abre la aplicación:

Ve a http://localhost:3000 en tu navegador (recomendado: Chrome o Edge). Asegúrate de darle permisos a la cámara y al micrófono cuando el navegador lo solicite.
