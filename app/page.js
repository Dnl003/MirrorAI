"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

const PROFILE_KEY = "userProfile";
const MEMORY_KEY = "mirrorProfiles";
const PROFILE_EVENT = "mirror-profile-updated";
const LOADING_PROFILE = "__loading_profile__";
const PROFILE_STORAGE_ERROR = "__profile_storage_error__";
const MAX_HISTORY = 40;
const INITIAL_GREETING = "Hola, soy tu Espejo Mágico. ¿Con quién tengo el gusto?";
const COLORES = [
  "negro",
  "blanco",
  "gris",
  "rojo",
  "azul",
  "verde",
  "amarillo",
  "naranja",
  "morado",
  "violeta",
  "rosa",
  "cafe",
  "marron",
  "beige",
  "dorado",
  "plateado",
  "turquesa",
  "vino",
  "lila",
];

function suscribirseAlPerfil(callback) {
  const escucharCambiosDeStorage = (event) => {
    if (event.key === PROFILE_KEY || event.key === null) callback();
  };

  window.addEventListener("storage", escucharCambiosDeStorage);
  window.addEventListener(PROFILE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", escucharCambiosDeStorage);
    window.removeEventListener(PROFILE_EVENT, callback);
  };
}

function leerPerfilSnapshot() {
  try {
    return window.localStorage.getItem(PROFILE_KEY) ?? "";
  } catch {
    return PROFILE_STORAGE_ERROR;
  }
}

function leerPerfilEnServidor() {
  return LOADING_PROFILE;
}

function normalizarPerfil(datos) {
  if (!datos || typeof datos !== "object" || typeof datos.nombre !== "string" || !datos.nombre.trim()) {
    return null;
  }

  return {
    nombre: datos.nombre.trim(),
    coloresFavoritos: Array.isArray(datos.coloresFavoritos)
      ? datos.coloresFavoritos.filter((color) => typeof color === "string")
      : [],
    estilo: typeof datos.estilo === "string" ? datos.estilo : "",
    historial: Array.isArray(datos.historial)
      ? datos.historial.filter(
          (mensaje) =>
            mensaje &&
            ["user", "assistant"].includes(mensaje.role) &&
            typeof mensaje.content === "string",
        ).slice(-MAX_HISTORY)
      : [],
  };
}

function normalizarNombre(nombre) {
  return nombre
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ");
}

function leerPerfilesMemorizados() {
  const snapshot = window.localStorage.getItem(MEMORY_KEY);
  if (!snapshot) return [];

  const perfiles = JSON.parse(snapshot);
  if (!Array.isArray(perfiles)) {
    throw new Error("La memoria de perfiles tiene un formato inválido.");
  }

  return perfiles
    .map(normalizarPerfil)
    .filter(Boolean)
    .map(({ nombre, coloresFavoritos, estilo }) => ({
      nombre,
      coloresFavoritos,
      estilo,
      historial: [],
    }));
}

function guardarPerfilMemorizado(perfil) {
  const perfiles = leerPerfilesMemorizados();
  const perfilMemorizado = {
    nombre: perfil.nombre,
    coloresFavoritos: perfil.coloresFavoritos,
    estilo: perfil.estilo,
    historial: [],
  };
  const indice = perfiles.findIndex(
    (guardado) => normalizarNombre(guardado.nombre) === normalizarNombre(perfil.nombre),
  );

  if (indice === -1) {
    perfiles.push(perfilMemorizado);
  } else {
    perfiles[indice] = perfilMemorizado;
  }

  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(perfiles));
}

function buscarPerfilMemorizado(nombre) {
  const perfil = leerPerfilesMemorizados().find(
    (guardado) => normalizarNombre(guardado.nombre) === normalizarNombre(nombre),
  );
  return perfil || null;
}

function detectarColoresFavoritos(texto) {
  const normalizado = texto
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const expresaPreferencia =
    /\b(me gusta(?:n)?|me encanta(?:n)?|amo|prefiero|mi color favorito es|mis colores favoritos son)\b/.test(
      normalizado,
    );

  if (!expresaPreferencia) return [];

  return COLORES.filter((color) => new RegExp(`\\b${color}\\b`).test(normalizado));
}

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);
  const perfilRef = useRef(null);
  const bienvenidaAgregadaRef = useRef(false);
  const sesionNuevaRef = useRef(false);

  // Sincronizamos localStorage con React sin leerlo durante el render del servidor.
  const snapshotPerfil = useSyncExternalStore(
    suscribirseAlPerfil,
    leerPerfilSnapshot,
    leerPerfilEnServidor,
  );
  const { perfilGuardado, errorPerfil } = useMemo(() => {
    if (snapshotPerfil === LOADING_PROFILE) {
      return { perfilGuardado: null, errorPerfil: false };
    }
    if (snapshotPerfil === PROFILE_STORAGE_ERROR) {
      return { perfilGuardado: null, errorPerfil: true };
    }
    if (!snapshotPerfil) {
      return { perfilGuardado: null, errorPerfil: false };
    }

    try {
      const perfilLeido = normalizarPerfil(JSON.parse(snapshotPerfil));
      return { perfilGuardado: perfilLeido, errorPerfil: !perfilLeido };
    } catch {
      return { perfilGuardado: null, errorPerfil: true };
    }
  }, [snapshotPerfil]);
  const perfil = perfilGuardado;

  const [perfilTemporal, setPerfilTemporal] = useState(null);
  const [pasoManual, setPasoManual] = useState(null);
  const [entrada, setEntrada] = useState("");
  const [ocasion, setOcasion] = useState("");
  const [clima, setClima] = useState("");
  const [fotoBase64, setFotoBase64] = useState("");
  const [fotoPreview, setFotoPreview] = useState("");
  const [stream, setStream] = useState(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [aviso, setAviso] = useState("");

  const perfilActivo = perfilTemporal || perfil;
  const cargado = snapshotPerfil !== LOADING_PROFILE;
  const esUsuarioNuevo = !perfilActivo || sesionNuevaRef.current;
  const paso = pasoManual || (perfilActivo ? "ocasion" : "nombre");
  const mensajes = useMemo(
    () =>
      perfilActivo
        ? perfilActivo.historial
        : cargado
          ? [{ role: "assistant", content: INITIAL_GREETING }]
          : [],
    [cargado, perfilActivo],
  );
  const avisoVisible =
    aviso ||
    (errorPerfil
      ? "No pude leer tu perfil guardado; empezaremos una conversación nueva."
      : "");

  const guardarPerfil = (nuevoPerfil) => {
    perfilRef.current = nuevoPerfil;

    let memoriaGuardada = true;
    try {
      guardarPerfilMemorizado(nuevoPerfil);
    } catch (error) {
      memoriaGuardada = false;
      console.error("No se pudo actualizar la memoria de perfiles:", error);
    }

    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nuevoPerfil));
      window.dispatchEvent(new Event(PROFILE_EVENT));
      setPerfilTemporal(null);
      setAviso(
        memoriaGuardada
          ? ""
          : "La conversación se guardó, pero no pude actualizar la memoria de perfiles.",
      );
    } catch (error) {
      console.error("No se pudo guardar el perfil en localStorage:", error);
      setPerfilTemporal(nuevoPerfil);
      setAviso("No se pudo guardar tu perfil en este navegador.");
    }
  };

  const agregarMensaje = (mensaje) => {
    const perfilActual = perfilRef.current;
    if (!perfilActual) return null;

    // Guardamos el historial acotado junto con el perfil para recuperar el contexto.
    const actualizado = {
      ...perfilActual,
      historial: [...perfilActual.historial, mensaje].slice(-MAX_HISTORY),
    };
    guardarPerfil(actualizado);
    return actualizado;
  };

  useEffect(() => {
    perfilRef.current = perfilActivo;
    if (!cargado || !perfilActivo || sesionNuevaRef.current || bienvenidaAgregadaRef.current) return;

    const gustos = [
      perfilActivo.estilo ? `tu estilo es ${perfilActivo.estilo}` : "",
      perfilActivo.coloresFavoritos.length
        ? `tus colores favoritos son ${perfilActivo.coloresFavoritos.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" y ");
    const saludo = {
      role: "assistant",
      content: `¡Hola, ${perfilActivo.nombre}! Qué bueno verte de nuevo${gustos ? `. Recuerdo que ${gustos}` : ""}. ¿A dónde vas hoy?`,
    };
    const perfilConSaludo = {
      ...perfilActivo,
      historial: [...perfilActivo.historial, saludo].slice(-MAX_HISTORY),
    };

    bienvenidaAgregadaRef.current = true;
    perfilRef.current = perfilConSaludo;
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(perfilConSaludo));
      window.dispatchEvent(new Event(PROFILE_EVENT));
    } catch (error) {
      console.error("No se pudo guardar el saludo en el historial:", error);
    }
  }, [cargado, perfilActivo, snapshotPerfil]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;

    videoRef.current.srcObject = stream;
    videoRef.current.play().catch((error) => {
      console.error("No se pudo reproducir la cámara:", error);
      setAviso("No se pudo mostrar la cámara. Revisa los permisos del navegador.");
    });
  }, [stream]);

  useEffect(() => {
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, cargando]);

  const hablar = (texto) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = "es-MX";
    voz.pitch = 1.08;
    window.speechSynthesis.speak(voz);
  };

  const consultarGemini = async ({ prompt, perfilActual, ocasionActual, climaActual, imagen }) => {
    setCargando(true);
    setPasoManual("analizando");

    try {
      const perfilParaGemini = {
        ...perfilActual,
        historial: perfilActual.historial.slice(-24, -1),
      };
      const respuesta = await fetch("/api/espejo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          userProfile: perfilParaGemini,
          contexto: { ocasion: ocasionActual, clima: climaActual },
          imagen,
        }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "Gemini no pudo responder.");
      }
      if (typeof datos.text !== "string" || !datos.text.trim()) {
        throw new Error("Gemini devolvió una respuesta vacía.");
      }

      setPasoManual("conversacion");
      agregarMensaje({ role: "assistant", content: datos.text });
      hablar(datos.text);
    } catch (error) {
      console.error("Error al consultar el espejo:", error);
      setPasoManual("conversacion");
      agregarMensaje({
        role: "assistant",
        content: "Tuve un problema al conectar con Gemini. Inténtalo otra vez en un momento.",
      });
    } finally {
      setCargando(false);
    }
  };

  const iniciarCamara = async () => {
    setAviso("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      setCamaraActiva(true);
    } catch (error) {
      console.error("No se pudo acceder a la cámara:", error);
      setAviso("No pude acceder a la cámara. Revisa los permisos del navegador.");
    }
  };

  // La foto se conserva solo en memoria; no se escribe dentro del perfil local.
  const capturarFoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setAviso("La cámara todavía está iniciando. Espera un momento e inténtalo de nuevo.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      setAviso("No pude preparar la foto. Inténtalo de nuevo.");
      return;
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imagen = canvas.toDataURL("image/jpeg", 0.75);
    const imagenBase64 = imagen.split(",")[1];
    setFotoBase64(imagenBase64);
    setFotoPreview(imagen);
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCamaraActiva(false);

    if (esUsuarioNuevo) {
      setPasoManual("ocasion");
      agregarMensaje({
        role: "assistant",
        content: "¡Foto lista! ¿A dónde vas? (por ejemplo, una cena, la escuela o una entrevista)",
      });
      return;
    }

    const perfilActual = perfilRef.current;
    if (!perfilActual) return;

    await consultarGemini({
      prompt: "Recomiéndame un outfit para mi ocasión y el clima de hoy usando mi foto y mi perfil.",
      perfilActual,
      ocasionActual: ocasion,
      climaActual: clima,
      imagen: imagenBase64,
    });
  };

  const procesarEntrada = async (texto) => {
    const respuestaUsuario = texto.trim();
    if (!respuestaUsuario || cargando || paso === "foto" || paso === "analizando") return;
    setEntrada("");

    // El primer turno guarda el nombre y exige una foto antes del cuestionario.
    if (paso === "nombre") {
      const nombre = respuestaUsuario.slice(0, 80);
      const mensajeNombre = { role: "user", content: nombre };
      let memoriaExistente = null;

      try {
        memoriaExistente = buscarPerfilMemorizado(nombre);
      } catch (error) {
        console.error("No se pudo consultar la memoria de perfiles:", error);
        setAviso("No pude consultar los perfiles guardados; continuaré sin preferencias previas.");
      }

      if (memoriaExistente) {
        const gustos = [
          memoriaExistente.estilo ? `tu estilo es ${memoriaExistente.estilo}` : "",
          memoriaExistente.coloresFavoritos.length
            ? `tus colores favoritos son ${memoriaExistente.coloresFavoritos.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" y ");
        const saludo = {
          role: "assistant",
          content: `¡Qué bueno verte de nuevo, ${memoriaExistente.nombre}!${gustos ? ` Recuerdo que ${gustos}.` : ""} ¿A dónde vas hoy?`,
        };
        const perfilConMemoria = {
          ...memoriaExistente,
          historial: [
            { role: "assistant", content: INITIAL_GREETING },
            mensajeNombre,
            saludo,
          ],
        };

        sesionNuevaRef.current = false;
        bienvenidaAgregadaRef.current = true;
        guardarPerfil(perfilConMemoria);
        setPasoManual("ocasion");
        return;
      }

      const nuevoPerfil = {
        nombre,
        coloresFavoritos: [],
        estilo: "",
        historial: [
          { role: "assistant", content: INITIAL_GREETING },
          mensajeNombre,
        ],
      };
      sesionNuevaRef.current = true;
      bienvenidaAgregadaRef.current = true;
      guardarPerfil(nuevoPerfil);
      setPasoManual("foto");
      agregarMensaje({
        role: "assistant",
        content: `Mucho gusto, ${nombre}. Primero tómate una foto de tu look de hoy; así podré darte consejos que sí te queden.`,
      });
      return;
    }

    const mensajeUsuario = { role: "user", content: respuestaUsuario };
    let perfilActual = agregarMensaje(mensajeUsuario);
    if (!perfilActual) return;

    const coloresMencionados = detectarColoresFavoritos(respuestaUsuario);
    if (coloresMencionados.length) {
      perfilActual = {
        ...perfilActual,
        coloresFavoritos: [...new Set([...perfilActual.coloresFavoritos, ...coloresMencionados])],
      };
      guardarPerfil(perfilActual);
    }

    // Nuevos usuarios responden ocasión, estilo y clima; los recurrentes, ocasión y clima.
    if (paso === "ocasion") {
      setOcasion(respuestaUsuario);
      if (esUsuarioNuevo) {
        setPasoManual("estilo");
        agregarMensaje({
          role: "assistant",
          content: "¿Qué estilo te gusta más: casual, formal, urbano u otro?",
        });
      } else {
        setPasoManual("clima");
        agregarMensaje({ role: "assistant", content: "¿Cómo está el clima hoy donde estás?" });
      }
      return;
    }

    if (paso === "estilo") {
      perfilActual = { ...perfilActual, estilo: respuestaUsuario };
      guardarPerfil(perfilActual);
      setPasoManual("clima");
      agregarMensaje({ role: "assistant", content: "¿Cómo está el clima hoy donde estás?" });
      return;
    }

    if (paso === "clima") {
      setClima(respuestaUsuario);
      if (!esUsuarioNuevo) {
        setPasoManual("foto");
        agregarMensaje({
          role: "assistant",
          content: "Perfecto. Ahora activa la cámara y toma una foto de tu look de hoy para recomendarte algo a tu medida.",
        });
        return;
      }

      if (!fotoBase64) {
        setPasoManual("foto");
        setAviso("Necesito una foto de tu look para darte una recomendación personalizada.");
        return;
      }

      await consultarGemini({
        prompt: "Ya respondí las preguntas iniciales. Analiza mi foto y recomiéndame un outfit para hoy.",
        perfilActual,
        ocasionActual: ocasion,
        climaActual: respuestaUsuario,
        imagen: fotoBase64,
      });
      return;
    }

    if (paso === "conversacion") {
      if (!fotoBase64) {
        setPasoManual("foto");
        agregarMensaje({
          role: "assistant",
          content: "Para seguir con consejos sobre tu look de hoy, activa la cámara y comparte una foto actual.",
        });
        return;
      }

      await consultarGemini({
        prompt: respuestaUsuario,
        perfilActual,
        ocasionActual: ocasion,
        climaActual: clima,
        imagen: fotoBase64,
      });
    }
  };

  const enviarMensaje = (event) => {
    event.preventDefault();
    void procesarEntrada(entrada);
  };

  const escucharMicrofono = () => {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) {
      setAviso("Tu navegador no admite reconocimiento de voz. Prueba con Chrome o Edge.");
      return;
    }

    const reconocimiento = new Reconocimiento();
    reconocimiento.lang = "es-MX";
    reconocimiento.interimResults = false;
    reconocimiento.maxAlternatives = 1;
    reconocimiento.onstart = () => setEscuchando(true);
    reconocimiento.onend = () => setEscuchando(false);
    reconocimiento.onerror = (evento) => {
      setEscuchando(false);
      setAviso(`No se pudo usar el micrófono: ${evento.error}.`);
    };
    reconocimiento.onresult = (evento) => {
      void procesarEntrada(evento.results[0][0].transcript);
    };

    try {
      reconocimiento.start();
    } catch (error) {
      console.error("No se pudo iniciar el reconocimiento de voz:", error);
      setEscuchando(false);
      setAviso("No se pudo iniciar el micrófono. Inténtalo de nuevo.");
    }
  };

  const iniciarNuevaPersona = () => {
    if (cargando || escuchando || !perfilRef.current) return;

    try {
      guardarPerfilMemorizado(perfilRef.current);
      window.localStorage.removeItem(PROFILE_KEY);
      window.dispatchEvent(new Event(PROFILE_EVENT));
    } catch (error) {
      console.error("No se pudo iniciar una conversación nueva:", error);
      setAviso("No pude reiniciar la conversación; la persona actual sigue activa.");
      return;
    }

    sesionNuevaRef.current = true;
    bienvenidaAgregadaRef.current = true;
    perfilRef.current = null;
    setPerfilTemporal(null);
    setPasoManual("nombre");
    setEntrada("");
    setOcasion("");
    setClima("");
    setFotoBase64("");
    setFotoPreview("");
    setAviso("");
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCamaraActiva(false);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const entradaDeshabilitada =
    !cargado || cargando || paso === "foto" || paso === "analizando";
  const placeholder =
    paso === "nombre"
      ? "Escribe tu nombre..."
      : paso === "ocasion"
        ? "¿A dónde vas?"
        : paso === "estilo"
          ? "¿Qué estilo te gusta?"
          : paso === "clima"
            ? "¿Cómo está el clima?"
            : "Pregúntame lo que quieras...";

  return (
    <main className="mirror-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M10 5.5h12a3 3 0 0 1 3 3v11a9 9 0 0 1-18 0v-11a3 3 0 0 1 3-3Z" />
              <path d="M16 28v-4M12 28h8M11 11h10" />
            </svg>
          </span>
          <span className="brand-name">mirror<span>ai</span></span>
        </div>
        <div className="topbar-note">
          <span className="sparkle" aria-hidden="true">✦</span>
          TU ESTILISTA PERSONAL
        </div>
        <div className="connection-status">
          <span className={`status-dot ${camaraActiva ? "is-live" : ""}`} />
          {camaraActiva ? "ESPEJO ACTIVO" : "MEMORIA ACTIVA"}
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow"><span /> ESTILO, A TU MANERA</p>
        <h1>Tu reflejo, <em>tu mejor versión.</em></h1>
        <p className="intro-copy">
          Un consejo personalizado que recuerda lo que te hace sentir tú.
        </p>
      </section>

      <section className="studio" aria-label="Espejo de estilo interactivo">
        <div className="mirror-column">
          <div className="mirror-frame">
            <div className="mirror-topline">
              <span>
                <span className={`status-dot ${camaraActiva ? "is-live" : ""}`} />
                {camaraActiva ? "VISTA EN VIVO" : fotoPreview ? "TU LOOK DE HOY" : "ESPEJO EN ESPERA"}
              </span>
              <span className="mirror-mode">AI / 01</span>
            </div>
            <div className={`mirror-screen ${camaraActiva ? "camera-on" : ""}`}>
              {camaraActiva && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-feed"
                  aria-label="Vista en vivo de tu cámara"
                />
              )}
              {!camaraActiva && fotoPreview && (
                <Image
                  src={fotoPreview}
                  alt="Tu look de hoy"
                  fill
                  unoptimized
                  sizes="(max-width: 620px) 100vw, 60vw"
                  className="captured-image"
                />
              )}
              <canvas ref={canvasRef} className="hidden-canvas" />

              {!camaraActiva && !fotoPreview && (
                <div className="mirror-welcome">
                  <div className="mirror-orbit orbit-outer" />
                  <div className="mirror-orbit orbit-inner" />
                  <div className="welcome-icon" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none">
                      <rect x="17" y="7" width="30" height="42" rx="15" />
                      <path d="M11 29v3a21 21 0 0 0 42 0v-3M32 53v5M23 58h18" />
                      <path d="m41 13 3 3m-24 0 3-3" />
                    </svg>
                  </div>
                  <span className="welcome-caption">TU ESPEJO INTELIGENTE</span>
                  <p>Un momento para ti.<br />Un estilo que habla de ti.</p>
                  <span className="camera-hint">
                    {paso === "nombre" ? "COMENCEMOS CONOCIÉNDONOS" : "TU REFLEJO, EN CONFIANZA"}
                  </span>
                </div>
              )}

              {camaraActiva && (
                <div className="camera-corners" aria-hidden="true">
                  <i /><i /><i /><i />
                </div>
              )}

              {cargando && (
                <div className="analyzing-overlay">
                  <span className="analyzing-ring" />
                  <span>LEYENDO TU ESTILO</span>
                </div>
              )}

              {(camaraActiva || fotoPreview) && (
                <div className="screen-label">
                  <span className={`status-dot ${camaraActiva ? "is-live" : ""}`} />
                  {camaraActiva ? "MIRROR CAM" : "CAPTURA LISTA"}
                </div>
              )}
            </div>
            <div className="mirror-bottomline">
              <span>REFLEJA QUIÉN ERES</span>
              <span className="mirror-sensor" aria-hidden="true"><i /><i /><i /></span>
              <span>HECHO PARA TI <b>✦</b></span>
            </div>
          </div>
          <p className="privacy-note">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.5 2.5 4v3.8c0 3.1 2.3 5.8 5.5 6.7 3.2-.9 5.5-3.6 5.5-6.7V4L8 1.5Z" />
              <path d="m5.8 7.8 1.5 1.5 3-3" />
            </svg>
            Tu foto se procesa para asesorarte y no se guarda en tu perfil.
          </p>
        </div>

        <aside className="advisor-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow panel-eyebrow">TU ESPACIO DE ESTILO</p>
              <h2>{perfilActivo ? `Hola, ${perfilActivo.nombre}` : "Empecemos por conocernos"}</h2>
            </div>
            <div className="panel-heading-actions">
              {perfilActivo && (
                <button
                  aria-label="Comenzar con otra persona"
                  className="new-person-button"
                  disabled={cargando || escuchando}
                  onClick={iniciarNuevaPersona}
                  title="Iniciar una conversación nueva y conservar los perfiles"
                  type="button"
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M16.5 8A6.7 6.7 0 0 0 4.7 5.2L3.5 6.5M3.5 3.5v3h3" />
                    <path d="M3.5 12a6.7 6.7 0 0 0 11.8 2.8l1.2-1.3m0 3v-3h-3" />
                  </svg>
                  <span>Nueva persona</span>
                </button>
              )}
              <span className="panel-star" aria-hidden="true">✳</span>
            </div>
          </div>

          <div className="advisor-card">
            <div className="advisor-avatar" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M10 5.5h12a3 3 0 0 1 3 3v11a9 9 0 0 1-18 0v-11a3 3 0 0 1 3-3Z" />
                <path d="M16 28v-4M12 28h8M11 11h10" />
              </svg>
              <i />
            </div>
            <div className="advisor-copy">
              <span className="advisor-name">Tu asesor MirrorAI</span>
              <span className="advisor-subtitle">
                {cargando
                  ? "Pensando en tu próximo look..."
                  : escuchando
                    ? "Te estoy escuchando..."
                    : paso === "nombre"
                      ? "Listo para aprender de ti"
                      : "Conversación personalizada"}
              </span>
            </div>
            <span className="online-tag"><i /> ONLINE</span>
          </div>

          {perfilActivo && (
            <div className="profile-summary">
              {perfilActivo.estilo && <span>Estilo: {perfilActivo.estilo}</span>}
              {perfilActivo.coloresFavoritos.length > 0 && (
                <span>Colores: {perfilActivo.coloresFavoritos.join(", ")}</span>
              )}
            </div>
          )}

          <div className={`response-card ${mensajes.length ? "has-response" : ""}`}>
            <span className="response-label">
              <span className="response-star">✦</span>
              {mensajes.length ? "TU CONVERSACIÓN" : "UN BUEN COMIENZO"}
            </span>
            {mensajes.length ? (
              <div className="conversation-history" aria-live="polite">
                {mensajes.map((mensaje, indice) => (
                  <div
                    className={`conversation-message ${mensaje.role === "user" ? "from-user" : "from-assistant"}`}
                    key={`${indice}-${mensaje.role}`}
                  >
                    <span>{mensaje.role === "user" ? perfilActivo?.nombre || "TÚ" : "MIRRORAI"}</span>
                    <p>{mensaje.content}</p>
                  </div>
                ))}
                {cargando && (
                  <div className="typing-indicator" aria-label="El asesor está escribiendo">
                    <i /><i /><i />
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="response-prompt">“La confianza es el mejor accesorio.<br />Vamos a encontrar el tuyo.”</p>
                <span className="response-hint">Dime tu nombre para comenzar.</span>
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {avisoVisible && <p className="notice-message" aria-live="polite">{avisoVisible}</p>}

          <form className="chat-composer" onSubmit={enviarMensaje}>
            <input
              aria-label="Escribe una respuesta o pregunta para MirrorAI"
              autoComplete="off"
              disabled={entradaDeshabilitada}
              onChange={(event) => setEntrada(event.target.value)}
              placeholder={placeholder}
              value={entrada}
            />
            <button
              aria-label="Enviar mensaje"
              className="chat-send"
              disabled={!entrada.trim() || entradaDeshabilitada}
              type="submit"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 9.5 17 3l-4.5 14-2.6-5.8L3 9.5Z" />
                <path d="m9.9 11.2 3.5-3.5" />
              </svg>
            </button>
          </form>

          <div className="action-group">
            {paso === "foto" && (
              <button
                className="button button-primary"
                onClick={camaraActiva ? capturarFoto : iniciarCamara}
                disabled={cargando}
                type="button"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="3" y="5" width="14" height="11" rx="2" />
                  <circle cx="10" cy="10.5" r="3" />
                  <path d="m6 5 1-2h6l1 2" />
                </svg>
                <span>
                  <b>{camaraActiva ? "Tomar mi foto" : "Activar cámara"}</b>
                  <small>{camaraActiva ? "Captura tu look para analizarlo" : "Primero, comparte tu look de hoy"}</small>
                </span>
                {!camaraActiva && <span className="button-arrow">↗</span>}
              </button>
            )}

            <button
              className={`button button-secondary ${escuchando ? "is-listening" : ""}`}
              onClick={escucharMicrofono}
              disabled={entradaDeshabilitada || escuchando}
              type="button"
            >
              <span className="mic-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <rect x="7" y="2.5" width="6" height="10" rx="3" />
                  <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7 17.5h6" />
                </svg>
              </span>
              <span>
                <b>{escuchando ? "Te escucho..." : "Responder por voz"}</b>
                <small>
                  {paso === "nombre"
                    ? "También puedes decirme tu nombre"
                    : "Sigue la conversación hablando"}
                </small>
              </span>
              <span className="voice-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            </button>
          </div>

          <p className="favorite-colors-note">
            {perfilActivo?.coloresFavoritos.length
              ? `Recordaré tus colores favoritos: ${perfilActivo.coloresFavoritos.join(", ")}.`
              : "Cuéntame qué colores te gustan y los recordaré para la próxima."}
          </p>

          <div className="panel-footer">
            <span className="footer-line" />
            <span>ESTILO CON INTENCIÓN</span>
            <span className="footer-line" />
          </div>
        </aside>
      </section>

      <footer className="page-footer">
        <span>© 2026 MIRRORAI</span>
        <span>TECNOLOGÍA QUE REFLEJA LO MEJOR DE TI <b>✦</b></span>
      </footer>
    </main>
  );
}
