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
  const ultimaUrlRef = useRef<string | null>(null);

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
        
        // Verificação adicional: garantir que a companyId corresponda à atual
        const storedCompanyId = localStorage.getItem("userCompanyId");
        if (storedCompanyId && dadosEmissao.companyId !== parseInt(storedCompanyId)) {
          console.error("[Loading] Inconsistência de dados detectada:", {
            dadosCompanyId: dadosEmissao.companyId,
            storedCompanyId: parseInt(storedCompanyId)
          });
          throw new Error("O ID da empresa mudou. Por favor, volte ao PDV e inicie uma nova emissão.");
        }
        
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
      if (!url) return null;
      
      // Verifica se é uma URL da pretix (que inclui "pretix" ou "armazemdaestrela" no domínio)
      const isPretixUrl = url.includes('pretix') || url.includes('armazemdaestrela');
      
      if (isPretixUrl) {
        // Para URLs da pretix, extraímos o ID do caminho (geralmente o ID da ordem)
        const match = url.match(/\/orderpositions\/(\d+)\/download/);
        if (match && match[1]) {
          console.log("ID da ordem encontrado na URL:", match[1]);
          return match[1];
        }
        
        // Se o padrão acima não funcionar, tentar outro padrão comum em URLs da pretix
        const secondMatch = url.match(/\/orders\/([^\/]+)\/download/);
        if (secondMatch && secondMatch[1]) {
          console.log("ID da ordem encontrado na URL (padrão alternativo):", secondMatch[1]);
          return secondMatch[1];
        }
        
        // Tentativa final: apenas extrair qualquer sequência de números que pareça um ID
        const fallbackMatch = url.match(/\/(\d+)\/download/);
        if (fallbackMatch && fallbackMatch[1]) {
          console.log("ID numérico encontrado na URL:", fallbackMatch[1]);
          return fallbackMatch[1];
        }
      }
      
      // Método original como fallback para outros tipos de URL
      const baseUrl = url.split('?')[0];
      const segments = baseUrl.split('/');
      const lastSegment = segments[segments.length - 1];
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
      if (!url) {
        throw new Error("URL do PDF não fornecida");
      }
      
      // Verifica se é uma URL para domínios da pretix ou armazemdaestrela
      if (url.includes('pretix') || url.includes('armazemdaestrela')) {
        // Para URLs da pretix, tentamos acessar diretamente o PDF
        console.log("URL da pretix detectada, verificando diretamente:", url);
        
        try {
          // Tenta fazer uma requisição HEAD para verificar se o PDF está disponível
          const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-store',
          });
          
          // Se o status for 200, o PDF está pronto
          if (response.ok) {
            console.log("PDF está pronto (via HEAD request)");
            return true;
          } else {
            console.log("PDF não está pronto (status", response.status, ")");
            return false;
          }
        } catch (fetchError) {
          console.log("Erro ao verificar PDF via HEAD request:", fetchError);
          // Se falhar, tenta o método original
        }
      }
      
      // Extrai o ID do PDF da URL
      const pdfId = extractPdfId(url);
      
      if (!pdfId) {
        console.error("ID do PDF não encontrado na URL:", url);
        // Se não conseguir extrair o ID, tentamos abrir diretamente
        return true;
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
      
      // Se o status for diferente, assumimos que o PDF está pronto
      // para evitar bloqueios desnecessários
      console.log("Status desconhecido do PDF, assumindo que está pronto:", data);
      return true;
    } catch (error) {
      console.error("Erro ao verificar PDF:", error);
      // Em caso de erro, assumimos que o PDF está pronto para permitir que o usuário tente abrir
      return true;
    }
  };

  // Função para tentar baixar o PDF com retry
  const tryDownloadPdf = async (url: string, maxRetries = 20, retryDelay = 2000) => {
    setDownloadingPdf(true);
    
    try {
      // Log da URL do PDF para depuração
      console.log("Tentando baixar PDF da URL:", url);
      
      // Verifica se é a mesma URL que foi aberta anteriormente
      const isRetry = url === ultimaUrlRef.current;
      
      // Verifica se é uma URL direta para a pretix ou armazemdaestrela (URLs externas)
      if (url.includes('pretix') || url.includes('armazemdaestrela')) {
        console.log("URL externa detectada, abrindo diretamente");
        
        // Se for uma retry com a mesma URL, força download em vez de apenas abrir
        if (isRetry) {
          console.log("Tentando forçar download direto ao invés de apenas abrir em nova aba");
          
          try {
            // Cria um link temporário para fazer download direto
            const link = document.createElement('a');
            link.href = url;
            link.download = `ingresso-${Date.now()}.pdf`; // Nome do arquivo com timestamp
            link.target = '_blank'; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download do PDF iniciado!");
          } catch (downloadError) {
            console.error("Erro ao tentar baixar diretamente:", downloadError);
            // Fallback para abrir em nova aba
            window.open(url, '_blank');
            toast.success("PDF aberto em nova aba!");
          }
        } else {
          // Na primeira tentativa, apenas abrimos em nova aba
          window.open(url, '_blank');
          toast.success("PDF aberto em nova aba!");
        }
        
        // Guarda a URL aberta para referência futura
        ultimaUrlRef.current = url;
        return true;
      }
      
      // Para outras URLs, usamos o processo de verificação
      let tentativas = 0;
      while (tentativas < maxRetries) {
        try {
          const isReady = await checkPdfAvailability(url);
          
          if (isReady) {
            // Abre o PDF em uma nova aba
            window.open(url, '_blank');
            toast.success("PDF aberto em nova aba!");
            ultimaUrlRef.current = url;
            return true;
          }
        } catch (checkError) {
          console.error(`Erro na tentativa ${tentativas + 1}:`, checkError);
          // Se falhar na verificação após algumas tentativas, tentar abrir diretamente
          if (tentativas > 5) {
            console.log("Falhas contínuas na verificação, tentando abrir diretamente");
            window.open(url, '_blank');
            toast.success("Tentando abrir PDF diretamente!");
            ultimaUrlRef.current = url;
            return true;
          }
        }

        // Se não estiver pronto e ainda tiver tentativas
        if (tentativas === 0) {
          toast.info("Aguarde, o PDF está sendo gerado...");
        } else if (tentativas === 5) {
          toast.info("Ainda estamos processando seu PDF, por favor aguarde...");
        } else if (tentativas === 10) {
          toast.info("O PDF está quase pronto...");
        } else if (tentativas === 15) {
          toast.info("Continuamos processando seu PDF, isso pode levar mais alguns instantes...");
        }

        // Espera antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        tentativas++;
      }
      
      // Se chegou aqui após todas as tentativas, vamos tentar abrir diretamente mesmo assim
      console.log("Tempo limite excedido, tentando abrir diretamente");
      window.open(url, '_blank');
      toast.warning("O PDF pode não estar pronto, mas tentamos abrir mesmo assim.");
      ultimaUrlRef.current = url;
      return true;
    } catch (error) {
      console.error("Erro ao verificar PDF:", error);
      
      // Mesmo com erro, tentamos abrir o PDF diretamente
      try {
        window.open(url, '_blank');
        toast.warning("Houve um erro na verificação, mas tentamos abrir o PDF diretamente.");
        ultimaUrlRef.current = url;
        return true;
      } catch (openError) {
        toast.error("Não foi possível abrir o PDF. Por favor, tente novamente em alguns instantes.");
        return false;
      }
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
      
      // Usa a função de verificação e retry em vez de abrir diretamente
      tryDownloadPdf(pdfUrl);
    } else {
      console.log("Nenhum PDF encontrado nos downloads:", ingressoEmitido.downloads);
      toast.error("Nenhum PDF disponível para download");
    }
  };

  const handleProximaVenda = () => {
    // Guarda valores importantes que precisamos preservar
    const ultimoEvento = localStorage.getItem("ultimoEventoSelecionado");
    const userCompanyId = localStorage.getItem("userCompanyId");
    
    // Limpa apenas as flags relacionadas à emissão, em vez de limpar todo o localStorage
    localStorage.removeItem("emissaoCompleta");
    localStorage.removeItem("ingressoEmitido");
    localStorage.removeItem("dadosEmissao");
    localStorage.removeItem("tentativaEmissao");
    localStorage.removeItem("emissaoStatus");
    localStorage.removeItem("inicioProcessamento");
    
    // Certifica que o companyId continua no localStorage
    if (userCompanyId) {
      localStorage.setItem("userCompanyId", userCompanyId);
    }
    
    // Também restaura o último evento selecionado
    if (ultimoEvento) {
      localStorage.setItem("ultimoEventoSelecionado", ultimoEvento);
    }
    
    // Reseta o estado de emissão
    setEmitting(false);
    
    // Reseta a última URL do PDF
    ultimaUrlRef.current = null;
    
    // Redireciona para o PDV
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
                        Verificando disponibilidade do PDF...
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