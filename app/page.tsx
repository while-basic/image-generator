"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Button } from "@/src/components/ui/button"
import Image from "next/image"

interface Prediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed"
  output?: string[] | string | null
  error?: string
}

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [intervalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setPrediction(null)

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Failed to generate image")
      }

      const prediction = await response.json()
      setPrediction(prediction)

      // Poll for status changes
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/predictions/${prediction.id}`)
          const updatedPrediction = await response.json()

          if (response.status !== 200) {
            throw new Error(updatedPrediction.detail || "Failed to check prediction status")
          }

          setPrediction(updatedPrediction)
          
          if (updatedPrediction.status === "succeeded") {
            clearInterval(interval)
            setIsLoading(false)
          } else if (updatedPrediction.status === "failed") {
            clearInterval(interval)
            setError(updatedPrediction.error || "Failed to generate image")
            setIsLoading(false)
          }
        } catch (err: any) {
          clearInterval(interval)
          setError(err.message || "Failed to check prediction status")
          setIsLoading(false)
        }
      }, 1000)

      setIntervalId(interval)
    } catch (err: any) {
      setError(err.message || "Failed to generate image")
      setIsLoading(false)
    }
  }

  const imageUrl = prediction?.output?.[0] || prediction?.output

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Dream with SDXL</CardTitle>
          <CardDescription className="text-center">Enter a prompt to generate an image using Stable Diffusion XL</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !prompt.trim()}>
                {isLoading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {prediction && (
            <div className="mt-8">
              {(prediction.status === "starting" || prediction.status === "processing") && (
                <div className="text-center text-sm text-gray-500">
                  Processing your image...
                </div>
              )}
              {imageUrl && (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                  <Image
                    src={imageUrl}
                    alt={prompt}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-500">
            Powered by Replicate and SDX

            Made by chriscelaya.com
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
