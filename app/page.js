"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [stream, setStream] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [escuchando, setEscuchando] = useState(false);

  // 1. Encender la cámara
  const iniciarCamara = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setCamaraActiva(true);
      // Damos un pequeño respiro para que el video se dibuje antes de hablar
      setTimeout(() => {
        hablar("Bienvenido al espejo mágico. Tócame para comenzar.");
      }, 500);
    } catch (error) {
      alert("No se pudo acceder a la cámara. Revisa los permisos.");
      console.error(error);
    }
  };

  // 2. Conectar el stream al elemento de video en cuanto aparezca en pantalla
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.log("Error al reproducir:", e));
    }
  }, [stream, camaraActiva]);

  // 3. Función para que el navegador hable
  const hablar = (texto) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 4. Enviar foto a Gemini
  const tomarFotoYEnviar = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("La cámara aún está iniciando. Espera un segundo y vuelve a intentar.");
      return;
    }

    setCargando(true);
    setRespuesta("");
    setFotoCapturada(null);

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    
    // Dibujar el video en el canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Image = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
    setFotoCapturada(canvas.toDataURL("image/jpeg", 0.5));

    try {
      const res = await fetch("/api/espejo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: "Eres un espejo mágico sarcástico y divertido. Mira esta imagen. Describe a la persona en 2 frases y hazle una pregunta pícara.",
          imagen: base64Image 
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setRespuesta(data.text);
        hablar(data.text);
      } else {
        setRespuesta("Error: " + data.error);
      }
    } catch (error) {
      setRespuesta("Error de red. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  };

  // 5. Escuchar al usuario con el micrófono
  const escucharMicrofono = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setEscuchando(true);
    recognition.onend = () => setEscuchando(false);

    recognition.onresult = async (event) => {
      const textoUsuario = event.results[0][0].transcript;
      setCargando(true);
      setRespuesta(`Tú: "${textoUsuario}"`);

      try {
        const res = await fetch("/api/espejo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: `El usuario te acaba de decir: "${textoUsuario}". Responde de forma ingeniosa y breve como el espejo mágico.`
          }),
        });
        
        const data = await res.json();
        if (res.ok) {
          setRespuesta(prev => `${prev}\n\nEspejo: ${data.text}`);
          hablar(data.text);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };

    recognition.start();
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center", backgroundColor: "#111", color: "white", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#4db8ff" }}>Espejito Mágico 🪞</h1>
      
      {!camaraActiva ? (
        <button 
          onClick={iniciarCamara}
          style={{ padding: "15px 30px", fontSize: "1.2rem", cursor: "pointer", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "8px" }}
        >
          Encender Espejo
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
          
          <div style={{ position: "relative", width: "100%", maxWidth: "500px", border: "5px solid #4db8ff", borderRadius: "20px", overflow: "hidden" }}>
            {/* Usamos opacity 0 en lugar de display none para que la cámara cargue bien */}
            <video 
              ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", display: fotoCapturada ? "none" : "block", transform: "scaleX(-1)" }} 
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {fotoCapturada && (
              <img src={fotoCapturada} alt="Captura" style={{ width: "100%", transform: "scaleX(-1)" }} />
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button 
              onClick={tomarFotoYEnviar} 
              disabled={cargando || escuchando}
              style={{ padding: "15px 20px", fontSize: "1.1rem", cursor: cargando ? "not-allowed" : "pointer", backgroundColor: cargando ? "#555" : "#e63946", color: "white", border: "none", borderRadius: "8px" }}
            >
              {cargando ? "Pensando..." : "¡Espejito, espejito!"}
            </button>

            <button 
              onClick={escucharMicrofono}
              disabled={cargando || escuchando}
              style={{ padding: "15px 20px", fontSize: "1.1rem", cursor: escuchando ? "not-allowed" : "pointer", backgroundColor: escuchando ? "#555" : "#2a9d8f", color: "white", border: "none", borderRadius: "8px" }}
            >
              {escuchando ? "Escuchando... 🎤" : "Hablar al Espejo 🎤"}
            </button>
          </div>
        </div>
      )}

      {respuesta && (
        <div style={{ marginTop: "2rem", padding: "1.5rem", backgroundColor: "#222", border: "2px solid #4db8ff", borderRadius: "12px", maxWidth: "600px", margin: "2rem auto", whiteSpace: "pre-line" }}>
          <p style={{ fontSize: "1.2rem", fontStyle: "italic", color: "#fff" }}>"{respuesta}"</p>
        </div>
      )}
    </main>
  );
}