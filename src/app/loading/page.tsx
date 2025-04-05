"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, FileDown, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirIngressos } from "@/services/api";
import { useEmissaoStore } from "@/store/emissaoStore";
import { toast } from "sonner";

interface IngressoEmitido {
  code: string;
  status: string;
  email?: string;
  phone?: string;
  total: string;
  url: string;
  positions: Array<{
    id: number;
    attendee_name: string;
    downloads: Array<{
      output: string;
      url: string;
    }>;
  }>;
  downloads: Array<{
    output: string;
    url: string;
  }>;
}

export default function LoadingPage() {
  const router = useRouter();
  const { isEmitting, setEmitting } = useEmissaoStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [ingressoEmitido, setIngressoEmitido] = useState<IngressoEmitido | null>(null);
  const emissaoRealizadaRef = useRef(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const processarEmissao = async () => {
      try {
        // Verifica se já foi emitido anteriormente
        const emissaoCompleta = localStorage.getItem("emissaoCompleta");
        const ingressoSalvo = localStorage.getItem("ingressoEmitido");
        
        if (emissaoCompleta === "true" && ingressoSalvo) {
          const ingresso = JSON.parse(ingressoSalvo);
          setIngressoEmitido(ingresso);
          setStatus("success");
          setEmitting(false);
          return;
        }

        // Recupera os dados da emissão
        const dadosEmissaoString = localStorage.getItem("dadosEmissao");
        if (!dadosEmissaoString) {
          throw new Error("Dados da emissão não encontrados");
        }

        const dadosEmissao = JSON.parse(dadosEmissaoString);
        console.log("[Loading] Dados de emissão recuperados:", dadosEmissao);
        
        // Verifica o estado da emissão atual
        const emissaoStatus = localStorage.getItem("emissaoStatus");

        // Se não há emissão em andamento
        if (!emissaoStatus) {
          try {
            // Marca que está iniciando uma nova emissão
            localStorage.setItem("emissaoStatus", "processing");

            console.log("[Loading] Iniciando emissão com dados:", dadosEmissao);
            
            // Tentativa de emissão com timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Timeout de emissão - 60s")), 60000)
            );
            
            const emissaoPromise = emitirIngressos(dadosEmissao);
            
            // Usa Promise.race para implementar timeout
            const ingresso = await Promise.race([emissaoPromise, timeoutPromise]) as any;
            
            console.log("[Loading] Resposta da emissão:", ingresso);
            
            if (ingresso && ingresso.code) {
              setIngressoEmitido(ingresso);
              setStatus("success");
              localStorage.setItem("emissaoCompleta", "true");
              localStorage.setItem("ingressoEmitido", JSON.stringify(ingresso));
              localStorage.setItem("emissaoStatus", "completed");
            } else {
              throw new Error("Resposta da emissão inválida ou incompleta");
            }
          } catch (emissaoError) {
            console.error("[Loading] Erro durante a emissão:", emissaoError);
            
            // Limpa o status de emissão em caso de erro
            localStorage.removeItem("emissaoStatus");
            
            // Formata o erro para exibição
            const errorMessage = emissaoError instanceof Error 
              ? emissaoError.message 
              : "Erro desconhecido ao emitir ingresso";
              
            throw new Error(`Falha na emissão: ${errorMessage}`);
          }
        } else if (emissaoStatus === "completed") {
          // Se a emissão já foi completada, tenta recuperar o resultado
          const ingressoSalvo = localStorage.getItem("ingressoEmitido");
          if (ingressoSalvo) {
            setIngressoEmitido(JSON.parse(ingressoSalvo));
            setStatus("success");
          } else {
            throw new Error("Status de emissão indica sucesso, mas nenhum ingresso foi encontrado");
          }
        } else {
          console.log("[Loading] Emissão em andamento, aguardando resposta...");
          
          // Verifica quanto tempo a emissão está em processamento
          const inicioProcesamento = localStorage.getItem("inicioProcessamento");
          if (!inicioProcesamento) {
            localStorage.setItem("inicioProcessamento", Date.now().toString());
          } else {
            const tempoDecorrido = Date.now() - parseInt(inicioProcesamento);
            
            // Se passou mais de 30s, considera como erro
            if (tempoDecorrido > 30000) {
              throw new Error("Tempo limite excedido para processamento da emissão");
            }
          }
        }

      } catch (err) {
        console.error("[Loading] Erro ao emitir ingressos:", err);
        let mensagemErro = "Erro ao emitir ingressos";
        
        if (err instanceof Error) {
          mensagemErro = err.message;
          
          // Verifica se é um erro da API com detalhes em formato JSON
          if (mensagemErro.includes('{') && mensagemErro.includes('}')) {
            try {
              // Tenta extrair o JSON do erro
              const jsonMatch = mensagemErro.match(/{.*}/);
              if (jsonMatch) {
                const jsonError = JSON.parse(jsonMatch[0]);
                
                if (jsonError.error) {
                  mensagemErro = jsonError.error;
                  
                  if (jsonError.missingFields) {
                    mensagemErro += `: Campos ausentes: ${jsonError.missingFields.join(', ')}`;
                  }
                  
                  if (jsonError.details) {
                    mensagemErro += ` (${jsonError.details})`;
                  }
                }
              }
            } catch (parseError) {
              console.error("[Loading] Erro ao tentar parsear detalhe do erro:", parseError);
            }
          }
        }
        
        setError(mensagemErro);
        setStatus("error");
        
        // Limpa o status de emissão em caso de erro
        localStorage.removeItem("emissaoStatus");
        localStorage.removeItem("inicioProcessamento");
      } finally {
        setEmitting(false);
      }
    };

    processarEmissao();
  }, []); // Array de dependências vazio para executar apenas uma vez

  // Função auxiliar para extrair o ID do PDF da URL
  const extractPdfId = (url: string): string | null => {
    try {
      // Remove query parameters se houver
      const baseUrl = url.split('?')[0];
      
      // Pega o último segmento da URL
      const segments = baseUrl.split('/');
      const lastSegment = segments[segments.length - 1];
      
      // Remove a extensão .pdf se houver
      const pdfId = lastSegment.replace(/\.pdf$/, '');
      
      return pdfId || null;
    } catch (error) {
      console.error("Erro ao extrair ID do PDF:", error);
      return null;
    }
  };

  // Função para verificar se o PDF está pronto
  const checkPdfAvailability = async (url: string): Promise<boolean> => {
    try {
      // Extrai o ID do PDF da URL
      const pdfId = extractPdfId(url);
      
      if (!pdfId) {
        throw new Error("ID do PDF não encontrado");
      }

      // Faz a requisição para o webhook de verificação do PDF
      const response = await fetch('https://n8nwebhook.vcrma.com.br/webhook/check-pdf-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          pdfId,
          url // Envia a URL completa também para o backend poder validar
        }),
      });
      
      const data = await response.json();
      
      if (data.status === "ready") {
        return true;
      }
      
      if (data.status === "processing") {
        return false;
      }
      
      throw new Error(data.message || "Erro ao verificar PDF");
    } catch (error) {
      console.error("Erro ao verificar PDF:", error);
      return false;
    }
  };

  // Função para tentar baixar o PDF com retry
  const tryDownloadPdf = async (url: string, maxRetries = 15, retryDelay = 2000) => {
    setDownloadingPdf(true);
    
    try {
      let tentativas = 0;
      while (tentativas < maxRetries) {
        const isReady = await checkPdfAvailability(url);
        
        if (isReady) {
          // Abre o PDF em uma nova aba
          window.open(url, '_blank');
          return true;
        }

        // Se não estiver pronto e ainda tiver tentativas
        if (tentativas === 0) {
          toast.info("Aguarde, o PDF está sendo gerado...");
        } else if (tentativas === 5) {
          toast.info("Ainda estamos gerando seu PDF, por favor aguarde...");
        } else if (tentativas === 10) {
          toast.info("O PDF está quase pronto...");
        }

        // Espera antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        tentativas++;
      }
      
      throw new Error("Tempo limite excedido ao gerar o PDF");
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      toast.error("Erro ao gerar o PDF. Por favor, tente novamente em alguns instantes.");
      return false;
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!ingressoEmitido || downloadingPdf) return;

    console.log("Ingresso emitido completo:", ingressoEmitido); // Log do objeto completo
    console.log("Downloads disponíveis:", ingressoEmitido.downloads); // Log dos downloads

    // Primeiro tenta baixar o PDF do pedido completo
    const pdfUrl = ingressoEmitido.downloads?.find(d => d.output === "pdf")?.url;
    
    if (pdfUrl) {
      console.log("URL do PDF encontrada:", pdfUrl);
      
      // Tenta baixar diretamente sem verificação
      window.open(pdfUrl, '_blank');
      toast.success("Abrindo PDF em nova aba...");
    } else {
      console.log("Nenhum PDF encontrado nos downloads:", ingressoEmitido.downloads);
      toast.error("Nenhum PDF disponível para download");
    }
  };

  const handleProximaVenda = () => {
    // Guarda o último evento selecionado
    const ultimoEvento = localStorage.getItem("ultimoEventoSelecionado");
    
    // Limpa todo o localStorage
    localStorage.clear();
    
    // Restaura apenas o último evento selecionado
    if (ultimoEvento) {
      localStorage.setItem("ultimoEventoSelecionado", ultimoEvento);
    }

    // Garante que todas as flags de emissão sejam removidas
    localStorage.removeItem("emissaoCompleta");
    localStorage.removeItem("ingressoEmitido");
    localStorage.removeItem("dadosEmissao");
    localStorage.removeItem("tentativaEmissao");
    
    // Reseta o estado de emissão
    setEmitting(false);
    
    router.push("/pdv");
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center"
      style={{
        backgroundImage: "url('/images/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay com gradiente */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none" />
      
      {/* Efeito de brilho */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 animate-pulse" />
      </div>

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl px-12 py-10 shadow-2xl w-full max-w-xl"
        >
          <div className="flex flex-col items-center space-y-8">
            {status === "loading" && (
              <>
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <h2 className="text-2xl font-medium text-white">Processando...</h2>
                <p className="text-gray-300">Aguarde um momento</p>
              </>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-8 w-full"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-medium text-white">Erro ao Emitir</h2>
                  <div className="bg-white/5 rounded-lg px-8 py-5 border border-white/10">
                    <p className="text-red-400">{error}</p>
                  </div>
                </div>

                <Button
                  onClick={() => router.push("/pdv")}
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all duration-300 shadow-xl shadow-purple-500/20 border border-white/10"
                >
                  Tentar Novamente
                </Button>
              </motion.div>
            )}

            {status === "success" && ingressoEmitido && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-8 w-full"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <Check className="w-12 h-12 text-white" />
                </div>
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-medium text-white">Ingresso Emitido!</h2>
                  <div className="bg-white/5 rounded-lg px-8 py-5 border border-white/10">
                    <p className="text-gray-400 text-sm mb-2">Código do Pedido</p>
                    <p className="text-2xl font-mono text-white">{ingressoEmitido.code}</p>
                  </div>
                </div>

                <div className="flex flex-col w-full gap-4 mt-8">
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPdf}
                    className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all duration-300 shadow-xl shadow-purple-500/20 border border-white/10 flex items-center justify-center gap-3"
                  >
                    {downloadingPdf ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-6 h-6" />
                        Baixar PDF
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleProximaVenda}
                    className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all duration-300 shadow-xl shadow-green-500/20 border border-white/10 flex items-center justify-center gap-3"
                  >
                    <ArrowRight className="w-6 h-6" />
                    Próxima Venda
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
} 