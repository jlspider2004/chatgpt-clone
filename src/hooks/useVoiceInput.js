import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudio } from '../api/transcribe'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

/** Mobile WebKit exposes SpeechRecognition but the cloud service often returns service-not-allowed. */
function prefersServerTranscription() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isMobile || isIOS
}

function getRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', extension: 'webm' }
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/mp4', extension: 'mp4' },
    { mimeType: 'audio/aac', extension: 'aac' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
  ]
  for (const item of candidates) {
    if (MediaRecorder.isTypeSupported(item.mimeType)) return item
  }
  return { mimeType: '', extension: 'webm' }
}

export function useVoiceInput({ onTranscript, onError, language = 'zh-CN' }) {
  const [status, setStatus] = useState('idle') // idle | listening | transcribing
  const [inputMode, setInputMode] = useState('idle') // idle | browser | record
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const startRecordingRef = useRef(null)

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
      setInterimText('')
      recognitionRef.current = null

      if (event.error === 'not-allowed') {
        setStatus('idle')
        onError?.('请允许使用麦克风权限')
        return
      }

      // Chrome/Android sometimes exposes SpeechRecognition but blocks the cloud service.
      if (
        (event.error === 'service-not-allowed' || event.error === 'network') &&
        navigator.mediaDevices?.getUserMedia
      ) {
        startRecordingRef.current?.()
        return
      }

      setStatus('idle')
      onError?.(`语音识别失败：${event.error}`)
    }

    recognition.onend = () => {
      if (mediaRecorderRef.current?.state === 'recording') return
      setStatus('idle')
      setInterimText('')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setInputMode('browser')
    setStatus('listening')
  }, [language, onError, onTranscript])

  const startRecording = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined') {
      onError?.('当前浏览器不支持录音，请改用文字输入')
      setStatus('idle')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream
      chunksRef.current = []

      const { mimeType, extension } = getRecordingMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      const blobType = mimeType || recorder.mimeType || 'audio/webm'
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = async () => {
        cleanupStream()
        const blob = new Blob(chunksRef.current, { type: blobType })
        chunksRef.current = []
        mediaRecorderRef.current = null

        if (blob.size === 0) {
          setStatus('idle')
          return
        }

        setStatus('transcribing')
        try {
          const text = await transcribeAudio(blob, extension)
          if (text) onTranscript(text)
          else onError?.('未识别到语音内容，请重试')
        } catch (err) {
          onError?.(err.message || '语音转写失败')
        } finally {
          setInputMode('idle')
          setStatus('idle')
        }
      }

      recorder.start(250)
      setInputMode('record')
      setStatus('listening')
    } catch (err) {
      onError?.(err.name === 'NotAllowedError' ? '请允许使用麦克风权限' : '无法访问麦克风')
      setStatus('idle')
    }
  }, [cleanupStream, onError, onTranscript])

  startRecordingRef.current = startRecording

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

    const canRecord = Boolean(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
    const canBrowserSpeech = Boolean(SpeechRecognition && !prefersServerTranscription())

    if (canBrowserSpeech) {
      startBrowserRecognition()
    } else if (canRecord) {
      startRecording()
    } else {
      onError?.('当前浏览器不支持语音输入，请改用文字输入')
    }
  }, [onError, startBrowserRecognition, startRecording, status, stopBrowserRecognition, stopRecording])

  const canRecord = Boolean(
    typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined',
  )
  const canBrowserSpeech = Boolean(SpeechRecognition && !prefersServerTranscription())

  const statusLabel =
    status === 'listening'
      ? interimText ||
        (inputMode === 'browser' ? '正在聆听，再次点击结束…' : '正在录音，再次点击结束并转写…')
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
    supportsVoice: canBrowserSpeech || canRecord,
  }
}
