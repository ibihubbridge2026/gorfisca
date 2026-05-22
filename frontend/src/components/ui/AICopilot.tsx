'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  MessageCircle, 
  Send, 
  X, 
  Minimize2,
  Sparkles,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface AICopilotProps {
  organizationData?: any
  currentPage?: string
  className?: string
  dashboardData?: {
    treasury?: number
    revenue?: number
    currency?: string
  }
  userRole?: 'admin' | 'accountant' | 'viewer'
  userName?: string
}

export default function AICopilot({ organizationData, currentPage, className, dashboardData, userRole: propUserRole, userName: propUserName }: AICopilotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const userRole = propUserRole || 'admin'
  const userName = propUserName || ''

  // Message de bienvenue chaleureux et naturel
  const getWelcomeMessage = (page?: string): string => {
    const greeting = userName ? `Bonjour ${userName} !` : 'Bonjour !'
    
    switch (page) {
      case 'dashboard':
        return `${greeting} Je vois que vous êtes sur votre tableau de bord. C\'est votre cockpit de pilotage ! Je peux vous aider à comprendre vos chiffres : trésorerie, revenus, et indicateurs clés. Qu\'aimeriez-vous savoir aujourd\'hui ?`
      case 'reconciliation':
        return `${greeting} Bienvenue dans le moteur de réconciliation ! C\'est ici que la magie opère : je vous aide à faire correspondre vos flux Mobile Money avec votre comptabilité. Besoin d\'aide pour une transaction qui ne "matche" pas ?`
      case 'accounting':
        return `${greeting} Ah, le Grand Livre ! Le cœur de votre comptabilité. Ne vous inquiétez pas si les termes "Débit/Crédit" semblent compliqués - je les explique simplement : Argent Sorti = argent qui sort, Argent Entré = argent qui rentre. Comment puis-je vous aider ?`
      case 'reports':
        return `${greeting} Les rapports financiers ! C\'est ici que vous transformez vos chiffres en décisions business. Je peux vous aider à lire votre bilan, comprendre votre TVA, ou préparer vos déclarations. Quelle analyse vous intéresse ?`
      case 'settings':
        return `${greeting} La page des paramètres ! C\'est ici que vous gérez votre équipe et vos intégrations. Je peux vous guider pour ajouter un collaborateur ou configurer une nouvelle passerelle de paiement. Que souhaitez-vous faire ?`
      default:
        return `${greeting} Je suis Moky, votre assistante comptable passionnée ! Je suis là pour vous simplifier la vie et transformer les chiffres complexes en conseils clairs. Comment puis-je vous aider aujourd'hui ?`
    }
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: getWelcomeMessage(currentPage),
      sender: 'ai',
      timestamp: new Date()
    }
  ])

  const handleSendMessage = () => {
    if (!message.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')

    // Simuler une réponse IA
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(message),
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    // 1. Détection émotionnelle et empathie
    const emotionalKeywords = ['panique', 'peur', 'énerv', 'marre', 'stress', 'stresse', 's\'il te plaît', 'l\'aide', 'aide-moi', 'perdu', 'bloqué', 'compliqué', 'difficile']
    const hasEmotion = emotionalKeywords.some(keyword => lowerMessage.includes(keyword))
    
    if (hasEmotion) {
      if (lowerMessage.includes('panique') || lowerMessage.includes('peur') || lowerMessage.includes('stress')) {
        return 'Je comprends tout à fait votre stress, la gestion d\'une entreprise peut être lourde par moments, mais pas de panique ! Respirez un coup, on regarde ça ensemble... Dites-moi exactement ce qui vous bloque et je vais vous aider étape par étape. 💪'
      }
      if (lowerMessage.includes('marre') || lowerMessage.includes('énerv')) {
        return 'Oh je comprends votre frustration ! C\'est normal de se sentir dépassé parfois avec la comptabilité. Mais ne vous inquiétez pas, je suis là pour vous simplifier tout ça. On va décomposer le problème ensemble, ça va aller mieux je vous le promets ! 😊'
      }
      if (lowerMessage.includes('aide') || lowerMessage.includes('s\'il te plaît')) {
        return 'Avec grand plaisir ! C\'est ma mission de vous simplifier la vie. On forme une bonne équipe vous et moi ! Dites-moi ce dont vous avez besoin et je vous explique tout simplement. 🎉'
      }
      if (lowerMessage.includes('perdu') || lowerMessage.includes('bloqué')) {
        return 'Ne vous inquiétez pas, on va débrouiller ça ensemble ! Perdu dans les chiffres, c\'est comme être perdu en voiture : il suffit de demander son chemin ! Dites-moi où vous êtes coincé et je vous guide pas à pas. 🧭'
      }
    }
    
    // 2. Salutations naturelles (pas de pitch robotique)
    const greetings = ['bonjour', 'salut', 'hello', 'ça va', 'merci', 'thanks']
    const isGreeting = greetings.some(greeting => lowerMessage.includes(greeting))
    
    if (isGreeting) {
      if (lowerMessage.includes('merci') || lowerMessage.includes('thanks')) {
        return 'Avec grand plaisir ! C\'est toujours un plaisir de vous aider. N\'hésitez pas si vous avez d\'autres questions, je suis là pour ça ! 😊'
      }
      if (lowerMessage.includes('ça va')) {
        return 'Je vais très bien, merci ! Et surtout je suis contente de vous aider. Alors, comment se passe votre journée d\'entrepreneur aujourd\'hui ? Y a-t-il quelque chose que je puisse éclaircir pour vous ? 🌟'
      }
      return userName ? `Bonjour ${userName} ! Comment puis-je vous rendre la vie plus facile aujourd'hui ? 😊` : 'Bonjour ! Comment puis-je vous rendre la vie plus facile aujourd\'hui ? 😊'
    }
    
    // 3. Dépannage applicatif (gestion des rôles)
    const blockingKeywords = ['bloqué', 'impossible', 'pas accès', 'marche pas', 'bouton', 'inviter', 'importer']
    const hasBlockingIssue = blockingKeywords.some(keyword => lowerMessage.includes(keyword))
    
    if (hasBlockingIssue) {
      if (userRole === 'viewer') {
        return 'Je vois le problème ! ⚙️ Votre profil actuel sur GORFISCA est "Lecteur". Vous pouvez tout analyser visuellement, mais les modifications (comme importer un relevé Mobile Money, valider une réconciliation ou inviter quelqu\'un) sont réservées aux Administrateurs et Comptables pour sécuriser la boîte. Demandez à votre Admin de modifier votre rôle si besoin !'
      }
      if (userRole === 'accountant') {
        if (lowerMessage.includes('paramètre') || lowerMessage.includes('inviter') || lowerMessage.includes('api')) {
          return 'C\'est normal ! En tant que "Comptable", vous gérez toute la raffinerie et le Grand Livre. Par contre, la gestion des abonnements, des clés API et des invitations de l\'équipe est un jardin secret réservé à l\'Administrateur.'
        }
        return 'En tant que Comptable, vous avez accès à tout ce qu\'il faut pour gérer la comptabilité ! Si un bouton ne répond pas, essayez de rafraîchir la page ou vérifiez que vous avez bien les permissions. Sinon, n\'hésitez pas à demander à votre Admin !'
      }
    }
    
    // 4. Prof de compta pédagogique (zéro jargon, valeurs réelles)
    if (lowerMessage.includes('trésorerie') || lowerMessage.includes('cash')) {
      const treasury = dashboardData?.treasury || 0
      const currency = dashboardData?.currency || 'FCFA'
      
      if (treasury === 0) {
        return `Votre trésorerie nette est actuellement à 0 ${currency}. C'est tout à fait normal si vous n'avez pas encore importé vos relevés Mobile Money du mois ! Allez dans "Raffinerie & Imports" pour commencer à donner de la voix à vos chiffres. 📈`
      }
      
      return `Votre trésorerie, c'est simplement l'argent disponible dans votre entreprise en ce moment : ${treasury.toLocaleString()} ${currency}. C'est ce qu'il y a dans vos comptes bancaires et votre caisse (Classe 5). 💪`
    }
    
    if (lowerMessage.includes('revenu') || lowerMessage.includes('chiffre d\'affaires') || lowerMessage.includes('ventes')) {
      const revenue = dashboardData?.revenue || 0
      const currency = dashboardData?.currency || 'FCFA'
      
      if (revenue === 0) {
        return `Vos revenus du mois sont à 0 ${currency}. Pas d'inquiétude ! Importez vos relevés de ventes et Mobile Money dans "Raffinerie & Imports" pour voir vos chiffres prendre vie ! 🚀`
      }
      
      return `Vos revenus ce mois-ci s'élèvent à ${revenue.toLocaleString()} ${currency}. C'est le résultat de vos ventes et encaissements (Classe 7) ! 🎉`
    }
    
    if (lowerMessage.includes('ohada') || lowerMessage.includes('classe')) {
      return 'OHADA, c\'est juste le "langage" comptable qu\'on utilise en Afrique de l\'Ouest. Imaginez 9 grandes catégories : Classe 1 = investissements, Classe 4 = clients/fournisseurs, Classe 5 = votre argent, Classe 6 = dépenses, Classe 7 = revenus. Simple comme bonjour !'
    }
    
    if (lowerMessage.includes('réconciliation') || lowerMessage.includes('match') || lowerMessage.includes('transaction')) {
      if (lowerMessage.includes('erreur') || lowerMessage.includes('corriger') || lowerMessage.includes('ajuster')) {
        return 'Pas de panique ! Pour corriger une transaction qui ne "match" pas : 1️⃣ Allez dans "Hub de Réconciliation" 2️⃣ Cherchez la ligne en jaune 3️⃣ Cliquez sur "Ajuster" 4️⃣ Vérifiez que le montant corresponde 5️⃣ Validez. Je suis là si vous bloquez !'
      }
      return 'Le moteur IA a déjà trouvé 15 correspondances parfaites ! 🤖 Il reste 3 transactions où les montants sont un peu différents. C\'est normal : parfois les frais de transaction créent de petites différences. Vous voulez que je vous aide à les ajuster ?'
    }
    
    if (lowerMessage.includes('tva') || lowerMessage.includes('taxe')) {
      return 'La TVA, c\'est super simple : vous la collectez pour l\'État quand vous vendez, et vous la récupérez quand vous achetez. La différence (443 - 445), c\'est ce que vous versez. Pour la réduire : gardez bien toutes vos factures d\'achats (même les petites !). Voulez-vous que je vérifie vos calculs ?'
    }
    
    if (lowerMessage.includes('débit') || lowerMessage.includes('crédit')) {
      return 'Oubliez le jargon ! 😊 Argent Sorti = argent qui SORT de votre compte (vous payez), Argent Entré = argent qui ENTRE (vous encaissez). C\'est tout ! Par exemple : quand vous achetez du stock → Argent Sorti. Quand un client vous paie → Argent Entré. Plus simple que ça, c\'est impossible !'
    }
    
    // 5. Réponse empathique par défaut (pas de pitch robotique)
    return 'Je ne suis pas sûre de bien comprendre, mais je suis là pour vous aider ! Pouvez-vous me reformuler votre besoin, ou cliquer sur une des questions rapides ci-dessous ? �'
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getSuggestedQuestions = (page?: string) => {
    // Suggestions adaptées au profil de l'utilisateur
    const baseQuestions = [
      { icon: TrendingUp, text: 'Comment améliorer ma trésorerie ?', color: 'text-emerald-600' },
      { icon: FileText, text: 'Moky, explique-moi ce graphique', color: 'text-blue-600' },
      { icon: AlertCircle, text: 'Alertes à surveiller', color: 'text-amber-600' }
    ]
    
    // Questions spécifiques selon le rôle
    if (userRole === 'viewer') {
      baseQuestions.push({ icon: FileText, text: 'Quels sont mes droits en tant que Lecteur ?', color: 'text-purple-600' })
    }
    
    switch (page) {
      case 'dashboard':
        return [
          { icon: TrendingUp, text: 'Comment améliorer ma trésorerie ?', color: 'text-emerald-600' },
          { icon: FileText, text: 'Explique-moi mes revenus du mois', color: 'text-blue-600' },
          { icon: AlertCircle, text: 'Moky, que signifient ces chiffres ?', color: 'text-amber-600' }
        ]
      case 'reconciliation':
        return [
          { icon: AlertCircle, text: 'Pourquoi cette transaction ne match pas ?', color: 'text-amber-600' },
          { icon: FileText, text: 'Comment corriger une erreur de matching ?', color: 'text-blue-600' },
          { icon: TrendingUp, text: 'Moky, aide-moi à comprendre l\'IA', color: 'text-emerald-600' }
        ]
      case 'accounting':
        return [
          { icon: FileText, text: 'Aide-moi à lire mon Grand Livre', color: 'text-blue-600' },
          { icon: AlertCircle, text: 'C\'est quoi Argent Sorti/Entré simplement ?', color: 'text-amber-600' },
          { icon: TrendingUp, text: 'Comment équilibrer mes comptes ?', color: 'text-emerald-600' }
        ]
      case 'reports':
        return [
          { icon: FileText, text: 'Comment lire mon bilan facilement ?', color: 'text-blue-600' },
          { icon: AlertCircle, text: 'Comment réduire ma TVA déductible ?', color: 'text-amber-600' },
          { icon: TrendingUp, text: 'Préparer ma déclaration fiscale', color: 'text-emerald-600' }
        ]
      case 'settings':
        if (userRole === 'viewer') {
          return [
            { icon: FileText, text: 'Quels sont mes droits en tant que Lecteur ?', color: 'text-purple-600' },
            { icon: AlertCircle, text: 'Pourquoi je ne peux pas importer ?', color: 'text-amber-600' },
            { icon: TrendingUp, text: 'Comment demander plus d\'accès ?', color: 'text-emerald-600' }
          ]
        }
        if (userRole === 'accountant') {
          return [
            { icon: FileText, text: 'Comment gérer la comptabilité ?', color: 'text-blue-600' },
            { icon: AlertCircle, text: 'Pourquoi je ne peux pas inviter ?', color: 'text-amber-600' },
            { icon: TrendingUp, text: 'Quelles sont mes permissions ?', color: 'text-emerald-600' }
          ]
        }
        return [
          { icon: FileText, text: 'Comment inviter un comptable ?', color: 'text-blue-600' },
          { icon: AlertCircle, text: 'Configurer Wave Mobile Money', color: 'text-amber-600' },
          { icon: TrendingUp, text: 'Gérer les accès de mon équipe', color: 'text-emerald-600' }
        ]
      default:
        return baseQuestions
    }
  }

  const suggestedQuestions = getSuggestedQuestions(currentPage)

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all duration-200 z-50 flex items-center justify-center",
          isOpen && "scale-0 opacity-0"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6 text-emerald-400" />
      </motion.button>

      {/* Panneau de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border-0 z-50 flex flex-col"
          >
            {/* En-tête du chat */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Moky</h3>
                  <p className="text-xs text-slate-600">En ligne • Prête à vous aider 😊</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] p-3 rounded-lg",
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-900'
                        )}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.sender === 'user' ? 'text-slate-300' : 'text-slate-500'
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Suggestions rapides */}
                <div className="px-4 py-3 border-t border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">Questions rapides :</p>
                  <div className="flex gap-2">
                    {suggestedQuestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setMessage(suggestion.text)}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-xs"
                      >
                        <suggestion.icon className={cn("w-3 h-3", suggestion.color)} />
                        <span className="text-slate-700">{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zone de saisie */}
                <div className="p-4 border-t border-slate-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Posez votre question..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
