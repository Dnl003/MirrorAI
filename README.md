
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

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/Dnl003/mirror-ai-estilista.git
   cd mirror-ai-estilista
Instala las dependencias:

bash
npm install
Configura tu API Key de Gemini (¡CRÍTICO!):

Crea un archivo en la raíz del proyecto llamado exactamente .env.local

Dentro de ese archivo, agrega la siguiente línea con tu propia clave de Google AI Studio:

env
GEMINI_API_KEY=tu_clave_de_api_aqui
(Puedes obtener una clave gratuita en Google AI Studio).

Inicia el servidor de desarrollo:

bash
npm run dev
Abre la aplicación:
Ve a http://localhost:3000 en tu navegador (recomendado: Chrome o Edge). Asegúrate de darle permisos a la cámara y al micrófono cuando el navegador lo solicite.

👥 Equipo
[Tu Nombre] - Lógica y Backend

[Nombre de tu Compañero] - Diseño UI/UX

text

4. Abajo de todo, en la sección "Commit changes", escribe un mensaje como `"Agrega instrucciones de instalación y configuración de API"`.
5. Haz clic en el botón verde **"Commit changes"**.

---

### 💡 Por qué esto es oro para MLH
Los jueces de MLH no solo evalúan la idea, sino también si el código es reproducible. Al poner claramente el paso de la API Key, demuestras que:
1. Sabes cómo proteger credenciales (usando `.env.local`).
2. Tu proyecto está documentado y listo para que cualquiera (incluido el jurado) lo pruebe sin ayuda.

¡Haz esa edición rápida y ya tienen un proyecto de nivel profesional! Dime si necesitas ayuda con algo más antes de la entrega. 🚀
Dame toda la descripción para el funcionamiento en un solo cuadro de texto
Aquí tienes el texto completo y unificado. Cópialo y pégalo directamente en el cuadro de descripción del repositorio (o en tu README). Está estructurado para que los jueces de MLH entiendan exactamente cómo funciona, qué tecnologías usaron y cómo probarlo sin perderse en el código.

MirrorAI: Tu Asesor de Estilo Personal 🪞👗

MirrorAI es un chatbot multimodal con visión y voz que actúa como tu estilista personal. A través de la cámara web, la aplicación analiza tu rostro, tu ropa y tu expresión en tiempo real para darte consejos de moda personalizados, útiles y con un toque de humor. Además, permite una conversación bidireccional: el espejo te habla en voz alta y tú puedes responderle o pedirle consejos específicos usando el micrófono.

🛠️ Tecnologías Utilizadas:

Frontend y Backend: Next.js (App Router) + Tailwind CSS.

Inteligencia Artificial: Google Gemini API (SDK oficial @google/genai) para visión por computadora y procesamiento de lenguaje natural.

Hardware del Navegador: WebRTC (Cámara), Web Speech API (Reconocimiento de voz) y SpeechSynthesis (Síntesis de voz).

🚀 Cómo ejecutar este proyecto localmente:

Clonar e instalar:
git clone https://github.com/Dnl003/espejito-magico.git
cd espejito-magico
npm install

Configurar API Key (CRÍTICO):
Crea un archivo llamado exactamente .env.local en la raíz del proyecto y agrega tu clave de Google AI Studio:
GEMINI_API_KEY=tu_clave_de_api_aqui

Iniciar:
npm run dev
Abre http://localhost:3000 en Chrome o Edge. Otorga los permisos de cámara y micrófono para interactuar con el espejo.
