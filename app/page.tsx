"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Button } from "@/src/components/ui/button"
import { Slider } from "@/src/components/ui/slider"
import { Label } from "@/src/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import Image from "next/image"
import { Settings2, ImagePlus, RefreshCcw, Download, Wand2 } from "lucide-react"
import { Textarea } from "@/src/components/ui/textarea"

interface Prediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed"
  output?: string[] | string | null
  error?: string
}

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  const [steps, setSteps] = useState(30)
  const [cfgScale, setCfgScale] = useState(7)
  const [size, setSize] = useState<"512" | "768" | "1024">("512")

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [intervalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt) {
      setError("Please enter a prompt")
      return
    }
    setIsLoading(true)
    setError(null)
    setPrediction(null)

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          num_inference_steps: steps,
          guidance_scale: cfgScale,
          width: parseInt(size),
          height: parseInt(size),
        }),
      })

      const prediction = await response.json()
      if (response.status !== 200) {
        setError(prediction.detail)
        setIsLoading(false)
        return
      }

      setPrediction(prediction)

      const intervalId = setInterval(async () => {
        const response = await fetch(`/api/predictions/${prediction.id}`)
        const updatedPrediction = await response.json()

        if (response.status !== 200) {
          setError(updatedPrediction.detail)
          setIsLoading(false)
          clearInterval(intervalId)
          return
        }

        setPrediction(updatedPrediction)

        if (updatedPrediction.status === "succeeded" || updatedPrediction.status === "failed") {
          setIsLoading(false)
          clearInterval(intervalId)
        }
      }, 1000)

      setIntervalId(intervalId)
    } catch (error) {
      setError("An error occurred")
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!prediction?.output) return
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generated-image-${size}x${size}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-5xl mx-auto space-y-8">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6" />
              AI Image Generator
            </CardTitle>
            <CardDescription>
              Generate beautiful images using stable diffusion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="A majestic lion sitting on a throne, digital art"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="negativePrompt">Negative Prompt</Label>
                <Input
                  id="negativePrompt"
                  placeholder="What you don't want to see in the image"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Image Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512">512 x 512</SelectItem>
                      <SelectItem value="768">768 x 768</SelectItem>
                      <SelectItem value="1024">1024 x 1024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Steps: {steps}</Label>
                  <Slider
                    value={[steps]}
                    onValueChange={(value) => setSteps(value[0])}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>CFG Scale: {cfgScale}</Label>
                  <Slider
                    value={[cfgScale]}
                    onValueChange={(value) => setCfgScale(value[0])}
                    min={1}
                    max={20}
                    step={0.1}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {prediction?.output && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <Image
                  src={Array.isArray(prediction.output) ? prediction.output[0] : prediction.output}
                  alt="Generated image"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="p-4 bg-muted/50">
                <Button onClick={handleDownload} variant="secondary" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
