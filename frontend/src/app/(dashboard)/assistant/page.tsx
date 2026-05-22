'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Sparkles, 
  User, 
  Bot,
  Clock,
  TrendingUp,
  FileText,
  Calculator,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Copy,
  Download,
  Settings,
  History,
  Lightbulb,
  Target,
  BarChart3,
  DollarSign,
  Shield
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isTyping?: boolean
  metadata?: {
    analysis_type?: string
    confidence?: number
    data?: any
    suggestions?: string[]
  }
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  last_activity: string
}

interface QuickSuggestion {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  prompt: string
  category: 'analysis' | 'reporting' | 'forecasting' | 'compliance'
}

export default function AssistantPage() {
  const t = useTranslations('assistant')
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Quick suggestions
  const quickSuggestions: QuickSuggestion[] = [
    {
      id: 'runway',
      title: t('analyze_runway'),
      description: t('analyze_runway_description'),
      icon: <Clock className="w-4 h-4" />,
      prompt: t('analyze_runway_prompt'),
      category: 'analysis'
    },
    {
      id: 'quarterly_balance',
      title: t('prepare_quarterly_balance'),
      description: t('prepare_quarterly_balance_description'),
      icon: <FileText className="w-4 h-4" />,
      prompt: t('prepare_quarterly_balance_prompt'),
      category: 'reporting'
    },
    {
      id: 'cash_flow',
      title: t('cash_flow_forecast'),
      description: t('cash_flow_forecast_description'),
      icon: <TrendingUp className="w-4 h-4" />,
      prompt: t('cash_flow_forecast_prompt'),
      category: 'forecasting'
    },
    {
      id: 'compliance',
      title: t('compliance_check'),
      description: t('compliance_check_description'),
      icon: <Shield className="w-4 h-4" />,
      prompt: t('compliance_check_prompt'),
      category: 'compliance'
    },
    {
      id: 'profit_analysis',
      title: t('profit_analysis'),
      description: t('profit_analysis_description'),
      icon: <BarChart3 className="w-4 h-4" />,
      prompt: t('profit_analysis_prompt'),
      category: 'analysis'
    },
    {
      id: 'expense_optimization',
      title: t('expense_optimization'),
      description: t('expense_optimization_description'),
      icon: <DollarSign className="w-4 h-4" />,
      prompt: t('expense_optimization_prompt'),
      category: 'analysis'
    }
  ]

  // Fetch chat sessions
  const { data: chatSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 'session_1',
          title: 'Analyse Runway Mai 2026',
          messages: [
            {
              id: 'msg_1',
              role: 'user' as const,
              content: 'Peux-tu analyser mon runway actuel ?',
              timestamp: '2026-05-21T14:30:00Z'
            },
            {
              id: 'msg_2',
              role: 'assistant' as const,
              content: 'Analysons votre situation financière actuelle...',
              timestamp: '2026-05-21T14:30:05Z',
              metadata: {
                analysis_type: 'runway_analysis',
                confidence: 0.92,
                data: {
                  current_cash: 8500000,
                  monthly_burn_rate: 450000,
                  runway_months: 18.9
                }
              }
            }
          ]
        },
        {
          id: 'session_2',
          title: 'Bilan Trimestriel Q1 2026',
          messages: [
            {
              id: 'msg_3',
              role: 'user' as const,
              content: 'Prépare le bilan trimestriel',
              timestamp: '2026-05-20T10:15:00Z'
            },
            {
              id: 'msg_4',
              role: 'assistant' as const,
              content: 'Je prépare votre bilan trimestriel pour Q1 2026...',
              timestamp: '2026-05-20T10:15:10Z'
            }
          ]
        }
      ] as ChatSession[]
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsTyping(true)
      
      // Simulate AI thinking time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate AI response
      const aiResponse = await simulateAIResponse(message)
      setIsTyping(false)
      
      return aiResponse
    },
    onSuccess: (response) => {
      if (currentSession) {
        const newMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString(),
          metadata: response.metadata
        }
        
        setCurrentSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage],
          last_activity: new Date().toISOString()
        } : null)
      }
    },
    onError: () => {
      setIsTyping(false)
    }
  })

  // Simulate AI response
  const simulateAIResponse = async (message: string) => {
    const responses = [
      {
        content: "Je comprends votre demande. Analysons vos données financières actuelles pour vous fournir une réponse précise.",
        metadata: {
          analysis_type: 'comprehensive',
          confidence: 0.95,
          suggestions: ['Consulter le rapport de trésorerie', 'Vérifier les prévisions de revenus', 'Analyser les tendances de dépenses']
        }
      },
      {
        content: "Basé sur mes analyses, je recommande de surveiller attentivement votre taux de burn mensuel qui a augmenté de 15% ce trimestre.",
        metadata: {
          analysis_type: 'burn_rate_analysis',
          confidence: 0.88,
          data: {
            burn_rate_increase: 0.15,
            recommended_actions: ['Optimiser les dépenses opérationnelles', 'Négocier avec les fournisseurs', 'Revoir les abonnements']
          }
        }
      },
      {
        content: "Votre situation financière est stable mais pourrait bénéficier d'une meilleure gestion de la trésorerie.",
        metadata: {
          analysis_type: 'financial_health',
          confidence: 0.91,
          data: {
            health_score: 7.8,
            improvement_areas: ['Gestion de trésorerie', 'Optimisation des coûts', 'Diversification des revenus']
          }
        }
      }
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  // Initialize with new session
  useEffect(() => {
    if (!currentSession && !sessionsLoading) {
      const newSession: ChatSession = {
        id: `session_${Date.now()}`,
        title: t('new_analysis'),
        messages: [],
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }
      setCurrentSession(newSession)
    }
  }, [currentSession, sessionsLoading])

  const handleSendMessage = () => {
    if (!inputValue.trim() || !currentSession) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    }

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      last_activity: new Date().toISOString()
    } : null)

    sendMessageMutation.mutate(inputValue)
    setInputValue('')
  }

  const handleQuickSuggestion = (suggestion: QuickSuggestion) => {
    if (!currentSession) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: suggestion.prompt,
      timestamp: new Date().toISOString()
    }

    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
      last_activity: new Date().toISOString()
    } : null)

    sendMessageMutation.mutate(suggestion.prompt)
  }

  const startNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: t('new_analysis'),
      messages: [],
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }
    setCurrentSession(newSession)
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId))
    if (currentSession?.id === sessionId) {
      startNewSession()
    }
  }

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user'
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
        
        <div className={`max-w-3xl ${isUser ? 'order-1' : ''}`}>
          <div className={`rounded-2xl p-4 ${
            isUser 
              ? 'bg-primary-container text-on-primary-container ml-auto' 
              : 'bg-surface-container text-on-surface'
          }`}>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            
            {message.metadata?.suggestions && (
              <div className="mt-3 space-y-2">
                {message.metadata.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Lightbulb className="w-3 h-3 text-amber-600" />
                    <span className="text-on-surface-variant">{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
            
            {message.metadata?.confidence && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs text-emerald-600">
                    {Math.round(message.metadata.confidence * 100)}% {t('confidence')}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-1 text-xs text-on-surface-variant">
            {format(new Date(message.timestamp), 'HH:mm', { locale: fr })}
          </div>
        </div>
        
        {isUser && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 order-2">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-80 bg-surface border-r border-surface-container-low flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-surface-container-low">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-on-surface">
                  {t('assistant_sidebar')}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <Button onClick={startNewSession} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {t('new_chat')}
              </Button>
            </div>
            
            {/* Chat Sessions */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-on-surface-variant mb-3">
                  {t('recent_chats')}
                </h3>
                {chatSessions?.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-primary-container text-on-primary-container'
                        : 'hover:bg-surface-container-low'
                    }`}
                    onClick={() => setCurrentSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {session.title}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => deleteSession(session.id)}>
                            <Trash2 className="w-3 h-3 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      {format(new Date(session.last_activity), 'dd MMM HH:mm', { locale: fr })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Suggestions */}
            <div className="p-4 border-t border-surface-container-low">
              <h3 className="text-sm font-medium text-on-surface-variant mb-3">
                {t('quick_suggestions')}
              </h3>
              <div className="space-y-2">
                {quickSuggestions.slice(0, 4).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-2 rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors"
                    onClick={() => handleQuickSuggestion(suggestion)}
                  >
                    <div className="flex items-center gap-2">
                      {suggestion.icon}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-on-surface truncate">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-on-surface-variant truncate">
                          {suggestion.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-surface via-surface-container to-surface">
        {/* Chat Header */}
        <div className="bg-surface border-b border-surface-container-low p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <History className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">
                    {t('fonaqo_ai_assistant')}
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    {t('expert_senior_precise_reassuring')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-xs">
                {t('online')}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    {t('export_chat')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('copy_last_response')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Welcome Message */}
            {!currentSession?.messages.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">
                  {t('welcome_message')}
                </h3>
                <p className="text-on-surface-variant mb-6">
                  {t('welcome_description')}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {quickSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-3 bg-surface-container rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors"
                      onClick={() => handleQuickSuggestion(suggestion)}
                    >
                      <div className="flex items-center gap-3">
                        {suggestion.icon}
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-on-surface">
                            {suggestion.title}
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            {suggestion.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* Messages */}
            {currentSession?.messages.map(renderMessage)}
            
            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-surface-container rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-sm text-on-surface-variant">
                        {t('typing')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area */}
        <div className="border-t border-surface-container-low p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t('ask_me_anything')}
                className="flex-1 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              {quickSuggestions.slice(4, 6).map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="text-xs"
                >
                  {suggestion.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
