import { NextResponse } from "next/server"

const userId = `usuario-${Date.now()}`
console.log("ID de usuario generado:", userId)

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    console.log("Mensaje recibido:", message)

    const response = await fetch("https://neuralgeniusai.com/webhook/fabimersan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: userId,
        message: message,
      }),
    })

    if (!response.ok) {
      throw new Error("Error al conectar con el Webhook")
    }

    const data = await response.json()
    console.log("Respuesta completa del Webhook:", JSON.stringify(data))

    // Extraer el mensaje del campo output
    let replyText = ""

    if (data.output) {
      // Si existe data.output, usarlo directamente
      replyText = data.output
    } else if (data.reply) {
      replyText = data.reply
    } else if (data.message) {
      replyText = data.message
    } else if (data.response) {
      replyText = data.response
    } else if (data.text) {
      replyText = data.text
    } else if (typeof data === "string") {
      replyText = data
    } else {
      // Si no se encuentra en ninguna ubicación conocida, usar un mensaje genérico
      replyText = "He recibido tu mensaje, pero no puedo generar una respuesta adecuada en este momento."
    }

    return NextResponse.json({ reply: replyText })
  } catch (error) {
    console.error("Error al enviar al Webhook:", error)
    return NextResponse.json({ reply: "Hubo un error al procesar tu solicitud." }, { status: 500 })
  }



}


