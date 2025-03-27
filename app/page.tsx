"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import Image from 'next/image'


// Definir los tipos de preguntas y sus inputs correspondientes
type InputType = "text" | "number" | "textarea" | "email" | "tel" | "date" | "select"

interface Message {
  id: string
  text: string
  isUser: boolean
  inputType?: InputType
  options?: string[] // Para inputs tipo select
  placeholder?: string
}

export default function ChatWithWebhook() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentInputType, setCurrentInputType] = useState<InputType>("text")
  const [currentOptions, setCurrentOptions] = useState<string[]>([])
  const [currentPlaceholder, setCurrentPlaceholder] = useState("Escribe un mensaje...")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Iniciar el chat con un mensaje de bienvenida
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        text: "Hola! 😊 Completa este breve form para conocer mejor tu caso y negocio, y aplicar para que te ayudemos a posicionar y escalar tu Marca Personal🚀   Si vemos que podemos ayudarte, mi equipo te contactará para contarte los próximos pasos.✨   PD: Sólo podremos plantear tu plan de acción, si llegas hasta el final. Por ello, no abandones esta ventana hasta completar el proceso.  ",
        isUser: false,
        inputType: "text",
      },
    ])
  }, [])

  // Desplazarse al final de los mensajes cuando se añade uno nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Función para enviar mensajes al webhook
  const sendMessage = async (message: string) => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error("Error al enviar el mensaje")
      }

      const data = await response.json()
      console.log("Respuesta recibida del API:", data)

      // Analizar la respuesta para determinar el tipo de input para la próxima interacción
      const nextInputInfo = analyzeResponseForInputType(data.reply)

      // Añadir la respuesta del bot
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${crypto.randomUUID()}`,
          text: data.reply,
          isUser: false,
          inputType: nextInputInfo.inputType,
          options: nextInputInfo.options,
          placeholder: nextInputInfo.placeholder,
        },
      ])

      // Actualizar el tipo de input para la próxima interacción
      setCurrentInputType(nextInputInfo.inputType)
      setCurrentOptions(nextInputInfo.options || [])
      setCurrentPlaceholder(nextInputInfo.placeholder || "Escribe un mensaje...")
    } catch (error) {
      console.error("Error detallado:", error)

      // Añadir mensaje de error
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${crypto.randomUUID()}`,
          text: "Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, intenta de nuevo.",
          isUser: false,
          inputType: "text",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Analizar la respuesta para determinar el tipo de input adecuado
  const analyzeResponseForInputType = (reply: string) => {
    const lowerReply = reply.toLowerCase()

    // Patrones para detectar tipos de input
    const patterns = {
      email: [/correo electr[óo]nico/i, /\bemail\b/i, /\be-mail\b/i, /direcci[óo]n de correo electr[óo]nico/i, /\bcorreo\b/i],
      number: [/edad/i, /a[ñn]os/i, /n[úu]mero/i, /cantidad/i, /cu[áa]ntos/i, /precio/i, /valor/i],
      tel: [/tel[ée]fono/i, /celular/i, /m[óo]vil/i, /contacto/i, /número de WhatsApp/i],
      date: [/fecha/i, /d[íi]a/i, /cu[áa]ndo/i, /calendario/i],
      textarea: [/describe/i, /cu[ée]ntanos/i, /explica/i, /detalla/i, /comentarios/i, /opini[óo]n/i],
      select: [/selecciona/i, /elige/i, /opciones/i, /alternativas/i, /escoge/i, /opci[óo]n/i],
    }

    // Detectar opciones para select
    let options: string[] = []
    if (lowerReply.includes("opciones") || lowerReply.includes("alternativas") || lowerReply.includes("elige") || lowerReply.includes("selecciona")) {
      // Buscar opciones en formato de lista (1. Opción, 2. Opción, etc.)
      const optionMatches = reply.match(/\d+\.\s*([^\n]+)/g)
      if (optionMatches && optionMatches.length > 0) {
        options = optionMatches.map((opt) => opt.replace(/^\d+\.\s*/, "").trim())
      }

      // Buscar opciones separadas por comas
      if (options.length === 0) {
        const commaOptions = reply.match(/(?:opciones|alternativas|entre|selecciona)(?:[:\s]+)([^.]+)/i)
        if (commaOptions && commaOptions[1]) {
          options = commaOptions[1].split(",").map((opt) => opt.trim())
        }
      }
    }

    // Determinar el tipo de input basado en patrones
    let inputType: InputType = "text" // Por defecto
    let placeholder = "Escribe un mensaje..."


    for (const [type, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        if (regex && regex.test(lowerReply)) {
          inputType = type as InputType

          // Establecer placeholder según el tipo
          switch (type) {
            case "email":
              placeholder = "ejemplo@correo.com"
              break
            case "number":
              placeholder = "Ingresa un número"
              break
            case "tel":
              placeholder = "+1234567890"
              break
            case "date":
              placeholder = "Selecciona una fecha"
              break
            case "textarea":
              placeholder = "Escribe tu respuesta detallada aquí..."
              break
            case "select":
              placeholder = "Selecciona una opción"
              break
          }

          break
        }
      }
    }

    // Si se detectaron opciones, forzar el tipo select
    if (options.length > 0) {
      inputType = "select"
      placeholder = "Selecciona una opción"
    }

    return { inputType, options, placeholder }
  }

  // Manejar el envío de mensajes
  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return

    // Añadir el mensaje del usuario
    const userMessage: Message = {
      id: `user-${crypto.randomUUID()}`,
      text: inputValue,
      isUser: true,
    }

    setMessages((prev) => [...prev, userMessage])

    // Enviar el mensaje al webhook
    sendMessage(inputValue)

    // Limpiar el input
    setInputValue("")
  }

  // Renderizar el tipo de input adecuado
  const renderInput = () => {
    switch (currentInputType) {
      case "textarea":
        return (
          <textarea
            className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            rows={4}
            disabled={isLoading}
          />
        )
      case "select":
        return (
          <select
            className="w-full flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            {currentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )
      case "email":
        return (
          <input
            type="email"
            className="w-full flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={isLoading}
          />
        )
      case "number":
        return (
          <input
            type="number"
            className="w-full flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            min="0"
            disabled={isLoading}
          />
        )
      case "tel":
        return (
          <input
            type="tel"
            className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={isLoading}
          />
        )
      case "date":
        return (
          <input
            type="date"
            className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={isLoading}
          />
        )
      default:
        return (
          <input
            type={currentInputType}
            className="w-full flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentPlaceholder}
            disabled={isLoading}
          />
        )
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fdf4f2]">
      <div className=" p-4 m-auto flex flex-col max-w-3xl">
        <div className="bg-white rounded-xl shadow-md">
          <Image src={"logo.jfif"} alt="" width={200} height={200} className="w-full p-4 rounded-xl"></Image>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 max-w-3xl w-full mx-auto p-4">
        <Card className="bg-white rounded-xl shadow-md p-6 mb-4 min-h-[60vh] flex flex-col">
          <div className="space-y-4 mb-4 flex-grow overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                {!message.isUser && (
                  <Avatar className="h-8 w-8 mr-2 bg-[#6D4C41]">
                    <img src="/placeholder.svg?height=32&width=32" alt="Avatar" />
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${message.isUser ? "bg-[#FFC969] text-[#545454]" : "bg-[#F89082] "
                    }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Avatar className="h-8 w-8 mr-2 bg-[#6D4C41]">
                  <img src="/placeholder.svg?height=32&width=32" alt="Avatar" />
                </Avatar>
                <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                  <div className="flex space-x-2">
                    <div
                      className="w-2 h-2 rounded-full bg-[#6D4C41] animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-[#6D4C41] animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-[#6D4C41] animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 mt-auto">

          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-full flex items-center gap-2">
            {renderInput()}
            <Button
              onClick={handleSubmit}
              className="bg-[#b4dbd7] hover:bg-[#2383A2] p-6"
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-6 w-5" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}



