import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudio } from '../api/transcribe'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useVoiceInput({ onTranscript, onError, language = 'zh-CN' }) {
  const [status, setStatus] = useState('idle') // idle | listening | transcribing
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stopBrowserRecognition = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const stop = useCallback(() => {
    stopBrowserRecognition()
    stopRecording()
    if (status === 'listening') {
      setStatus('idle')
      setInterimText('')
    }
  }, [status, stopBrowserRecognition, stopRecording])

  useEffect(() => () => {
    stopBrowserRecognition()
    stopRecording()
    cleanupStream()
  }, [cleanupStream, stopBrowserRecognition, stopRecording])

  const startBrowserRecognition = useCallback(() => {
    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = true
    recognition.interimResults = true

    let finalText = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setInterimText(interim)
      if (finalText) {
        onTranscript(finalText)
        finalText = ''
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return
      setStatus('idle')
      setInterimText('')
      onError?.(event.error === 'not-allowed' ? '请允许使用麦克风权限' : `语音识别失败：${event.error}`)
    }

    recognition.onend = () => {
      setStatus('idle')
      setInterimText('')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setStatus('listening')
  }, [language, onError, onTranscript])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = async () => {
        cleanupStream()
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        mediaRecorderRef.current = null

        if (blob.size === 0) {
          setStatus('idle')
          return
        }

        setStatus('transcribing')
        try {
          const text = await transcribeAudio(blob)
          if (text) onTranscript(text)
          else onError?.('未识别到语音内容，请重试')
        } catch (err) {
          onError?.(err.message || '语音转写失败')
        } finally {
          setStatus('idle')
        }
      }

      recorder.start()
      setStatus('listening')
    } catch (err) {
      onError?.(err.name === 'NotAllowedError' ? '请允许使用麦克风权限' : '无法访问麦克风')
      setStatus('idle')
    }
  }, [cleanupStream, onError, onTranscript])

  const toggle = useCallback(() => {
    if (status === 'transcribing') return

    if (status === 'listening') {
      if (recognitionRef.current) {
        stopBrowserRecognition()
      } else {
        stopRecording()
      }
      return
    }

    if (SpeechRecognition) {
      startBrowserRecognition()
    } else if (navigator.mediaDevices?.getUserMedia) {
      startRecording()
    } else {
      onError?.('当前浏览器不支持语音输入')
    }
  }, [onError, startBrowserRecognition, startRecording, status, stopBrowserRecognition, stopRecording])

  const statusLabel =
    status === 'listening'
      ? interimText || '正在聆听，再次点击结束…'
      : status === 'transcribing'
        ? '正在转写语音…'
        : ''

  return {
    status,
    interimText,
    statusLabel,
    isActive: status !== 'idle',
    toggle,
    stop,
    supportsVoice: Boolean(SpeechRecognition || navigator.mediaDevices?.getUserMedia),
  }
}
