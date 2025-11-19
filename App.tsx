import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { Message } from './types';

// --- QUIZ DATA ---
const quizData = [
  {
    question: "O que melhor define 'obsolescência programada'?",
    options: [
      "Um defeito de fabricação inesperado.",
      "A prática de projetar produtos com uma vida útil artificialmente curta.",
      "O desgaste natural de um produto ao longo do tempo.",
      "Uma atualização de software que melhora o aparelho.",
    ],
    correctAnswerIndex: 1,
    explanation: "Correto! A obsolescência programada é uma estratégia deliberada para que o consumidor precise trocar de produto com mais frequência."
  },
  {
    question: "O 'Cartel Phoebus', um famoso caso histórico, limitou a vida útil de qual produto?",
    options: [
      "Baterias de celular",
      "Impressoras",
      "Lâmpadas incandescentes",
      "Geladeiras",
    ],
    correctAnswerIndex: 2,
    explanation: "Exato! O cartel, formado pelos principais fabricantes nos anos 1920, padronizou a vida útil das lâmpadas em 1.000 horas, quando já existiam tecnologias para durar muito mais."
  },
  {
    question: "Quando uma empresa lança um novo design de smartphone a cada ano, com pequenas mudanças estéticas, fazendo o modelo anterior parecer 'ultrapassado', qual tipo de obsolescência está em ação?",
    options: [
      "Obsolescência funcional",
      "Obsolescência de software",
      "Obsolescência perceptiva (ou psicológica)",
      "Obsolescência técnica",
    ],
    correctAnswerIndex: 2,
    explanation: "Isso mesmo! A obsolescência perceptiva (ou psicológica) nos convence a trocar algo que ainda funciona perfeitamente, apenas por uma questão de estilo ou status."
  },
  {
    question: "Qual é um dos principais impactos negativos da obsolescência programada?",
    options: [
      "Aumento da inovação tecnológica.",
      "Diminuição dos preços dos produtos.",
      "Geração excessiva de lixo eletrônico e desperdício de recursos.",
      "Fortalecimento da economia local.",
    ],
    correctAnswerIndex: 2,
    explanation: "Correto. O descarte constante de eletrônicos gera toneladas de lixo tóxico e esgota recursos naturais preciosos para a fabricação de novos itens."
  },
  {
    question: "Qual movimento ou conceito se opõe diretamente à obsolescência programada, defendendo que os consumidores possam consertar seus próprios produtos?",
    options: [
      "Consumismo",
      "Minimalismo",
      "Direito de Reparar (Right to Repair)",
      "Economia Circular",
    ],
    correctAnswerIndex: 2,
    explanation: "Perfeito! O movimento pelo Direito de Reparar luta por leis que obriguem as empresas a disponibilizar peças, manuais e ferramentas para o conserto de produtos, estendendo sua vida útil."
  }
];

// --- HELPER & UI COMPONENTS ---
const HeaderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 10-1 4" />
    <path d="m14 14 7-6" />
    <path d="M4 20 20 4" />
    <path d="m15 4-1 1" />
    <path d="m10 9 1-1" />
    <path d="M14 20h-4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M18 14h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z" />
  </svg>
);

const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    <path d="M8.5 12.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
    <path d="M12 7c-2.76 0-5 2.24-5 5h10c0-2.76-2.24-5-5-5z" opacity=".3" />
    <path d="M12 8c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
  </div>
);

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isModel = message.role === 'model';
  return (
    <div className={`flex items-start gap-3 my-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
      {isModel && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><BotIcon className="w-5 h-5 text-blue-300" /></div>}
      <div
        className={`max-w-xs md:max-w-md lg:max-w-2xl rounded-lg px-4 py-3 shadow-md ${
          isModel ? 'bg-gray-800 text-gray-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-br-none'
        }`}
      >
        <p className="text-base whitespace-pre-wrap">{message.text}</p>
      </div>
      {!isModel && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><UserIcon className="w-5 h-5 text-gray-300" /></div>}
    </div>
  );
};

interface SuggestionChipProps {
  text: string;
  onClick: (text: string | number) => void;
  index?: number;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick, index }) => (
  <button
    onClick={() => onClick(typeof index === 'number' ? index : text)}
    className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm py-2 px-4 rounded-full transition-colors duration-200 ease-in-out whitespace-nowrap"
  >
    {text}
  </button>
);

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [isInQuiz, setIsInQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const GEMINI_SYSTEM_PROMPT = `Você é um chatbot educador, especialista em obsolescência programada. Sua missão é ensinar os usuários sobre este tópico de forma clara, interativa e em português do Brasil.
1. **Seja Amigável e Engajador:** Use uma linguagem acessível. Comece com uma saudação calorosa.
2. **Estrutura Guiada:** Após cada explicação, SEMPRE forneça de 2 a 4 sugestões de perguntas ou tópicos para o usuário clicar, guiando a conversa. Uma dessas sugestões pode ser para iniciar um quiz.
3. **Formato de Resposta OBRIGATÓRIO:** Sua resposta DEVE ser um objeto JSON que corresponda ao schema fornecido.
4. **INICIAR O QUIZ:** Se o usuário pedir para fazer um quiz ou escolher a opção de quiz, inclua o campo 'action' com o valor 'start_quiz' no seu JSON de resposta. O campo 'response' pode conter uma mensagem de introdução ao quiz.
5. **Conteúdo:** Cubra a definição, tipos, exemplos históricos e modernos, impactos (ambiental, econômico) e soluções (direito de reparar, consumo consciente).
6. **Mensagem Inicial:** Comece com uma mensagem de boas-vindas e as primeiras sugestões para iniciar a conversa.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      response: {
        type: Type.STRING,
        description: 'A resposta principal em texto para o usuário.',
      },
      suggestions: {
        type: Type.ARRAY,
        description: 'Uma lista de 2 a 4 sugestões de próximas perguntas ou tópicos para o usuário.',
        items: {
          type: Type.STRING,
        },
      },
      action: {
        type: Type.STRING,
        description: "Uma ação especial a ser executada. Use 'start_quiz' quando o usuário quiser iniciar o quiz.",
        nullable: true,
      },
    },
    required: ['response', 'suggestions'],
  };

  const parseResponse = (responseText: string) => {
    try {
      const data = JSON.parse(responseText);
      const mainText = data.response || '';
      const newSuggestions = data.suggestions || [];
      const action = data.action || null;
      return { mainText, newSuggestions, action };
    } catch (e) {
      console.error("Falha ao analisar a resposta JSON:", responseText, e);
      // Fallback para respostas que não são JSON
      return { mainText: "Desculpe, tive um problema ao processar a resposta. Tente novamente.", newSuggestions: [], action: null };
    }
  };

  const startQuiz = () => {
    setIsInQuiz(true);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSuggestions([]);
    const firstQuestion = quizData[0];
    const quizStartMessage: Message = {
      id: 'quiz-start-0',
      role: 'model',
      text: `Ótimo! Vamos testar seus conhecimentos.\n\nPergunta 1: ${firstQuestion.question}`,
    };
    setMessages(prev => [...prev, quizStartMessage]);
  };

  const endQuiz = async (finalScore?: number) => {
    setIsInQuiz(false);
    const usedScore = typeof finalScore === 'number' ? finalScore : score;

    let feedback = '';
    const percentage = (usedScore / quizData.length) * 100;
    if (percentage === 100) {
      feedback = 'Uau, pontuação perfeita! Você é um expert no assunto!';
    } else if (percentage >= 75) {
      feedback = 'Excelente desempenho! Você realmente entendeu os conceitos principais.';
    } else if (percentage >= 50) {
      feedback = 'Bom trabalho! Você está no caminho certo para entender tudo sobre obsolescência programada.';
    } else {
      feedback = 'Continue aprendendo! Cada erro é uma oportunidade. Que tal explorarmos mais algum tópico?';
    }

    const finalMessage: Message = {
      id: 'quiz-end',
      role: 'model',
      text: `Quiz finalizado! Você acertou ${usedScore} de ${quizData.length} perguntas. \n\n${feedback}`,
    };
    setMessages(prev => [...prev, finalMessage]);

    if (chat) {
      setIsLoading(true);
      try {
        const response = await chat.sendMessage({ message: "O quiz terminou. Por favor, me dê novas sugestões de tópicos para continuar a conversa." });
        const { newSuggestions } = parseResponse(response.text);
        setSuggestions(newSuggestions);
      } catch (err) {
        console.error("Failed to get post-quiz suggestions", err);
        setError("Não foi possível obter novas sugestões.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAnswer = (selectedIndex: number) => {
    const currentQuestion = quizData[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;

    const userAnswerMessage: Message = {
      id: `user-answer-${currentQuestionIndex}`,
      role: 'user',
      text: currentQuestion.options[selectedIndex],
    };

    // atualiza o score de forma segura (funcional)
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    const feedbackMessage: Message = {
      id: `model-feedback-${currentQuestionIndex}`,
      role: 'model',
      text: isCorrect
        ? `Correto! ${currentQuestion.explanation}`
        : `Incorreto. A resposta certa era: "${currentQuestion.options[currentQuestion.correctAnswerIndex]}".\n\n${currentQuestion.explanation}`,
    };

    setMessages(prev => [...prev, userAnswerMessage, feedbackMessage]);

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < quizData.length) {
      setTimeout(() => {
        const nextQuestion = quizData[nextIndex];
        const nextQuestionMessage: Message = {
          id: `quiz-question-${nextIndex}`,
          role: 'model',
          text: `Pergunta ${nextIndex + 1}: ${nextQuestion.question}`,
        };
        setMessages(prev => [...prev, nextQuestionMessage]);
        setCurrentQuestionIndex(nextIndex);
      }, 1500);
    } else {
      // última pergunta: calcula o score final localmente (score atual + 1 se acertou)
      const guessedFinalScore = isCorrect ? score + 1 : score;
      setTimeout(() => endQuiz(guessedFinalScore), 1500);
    }
  };

  const fetchInitialMessage = useCallback(async (chatSession: Chat) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatSession.sendMessage({ message: "Olá! Por favor, se apresente e me dê as primeiras opções para começar." });
      const { mainText, newSuggestions } = parseResponse(response.text);

      const initialMessage: Message = {
        id: 'initial-0',
        role: 'model',
        text: mainText,
      };
      setMessages([initialMessage]);
      setSuggestions(newSuggestions);
    } catch (err) {
      console.error(err);
      setError('Falha ao iniciar a conversa. Verifique sua chave de API e a conexão.');
      setMessages([{
        id: 'error-0',
        role: 'model',
        text: 'Olá! Parece que estou com problemas para me conectar. Por favor, tente recarregar a página.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const chatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: GEMINI_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });
        setChat(chatSession);
        await fetchInitialMessage(chatSession);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Não foi possível inicializar o chatbot. A chave de API está configurada?");
        setIsLoading(false);
      }
    };
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatWindowRef.current?.scrollTo({
      top: chatWindowRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !chat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await chat.sendMessage({ message: text });
      const { mainText, newSuggestions, action } = parseResponse(response.text);

      if (action === 'start_quiz') {
        if (mainText) {
          const modelMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: mainText,
          };
          setMessages(prev => [...prev, modelMessage]);
        }
        startQuiz();
      } else {
        const modelMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: mainText,
        };
        setMessages(prev => [...prev, modelMessage]);
        setSuggestions(newSuggestions);
      }
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Falha ao obter resposta do modelo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(userInput);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 border-b border-gray-700 shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <HeaderIcon className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold text-center text-blue-300">Chat Sobre Obsolescência Programada</h1>
        </div>
      </header>

      <main ref={chatWindowRef} className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && !isInQuiz && <LoadingSpinner />}
          {error && <p className="text-center text-red-400 p-4">{error}</p>}
        </div>
      </main>

      <footer className="bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          {isInQuiz ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400 mb-2">Escolha uma opção:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {quizData[currentQuestionIndex].options.map((option, index) => (
                  <SuggestionChip key={index} text={option} onClick={() => handleAnswer(index)} />
                ))}
              </div>
            </div>
          ) : (
            <>
              { !isLoading && suggestions.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap mb-3 overflow-x-auto pb-2">
                  {suggestions.map((suggestion, index) => (
                    <SuggestionChip key={index} text={suggestion} onClick={handleSendMessage} />
                  ))}
                </div>
              )}
              <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Digite sua pergunta aqui..."
                  aria-label="Caixa de entrada da mensagem"
                  disabled={isLoading}
                  className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-full py-3 px-5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow duration-200 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || isLoading}
                  aria-label="Enviar mensagem"
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full p-3 transition-colors duration-200 ease-in-out flex-shrink-0"
                >
                  <SendIcon className="w-6 h-6" />
                </button>
              </form>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;

