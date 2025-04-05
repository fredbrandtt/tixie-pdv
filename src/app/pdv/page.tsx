"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, RotateCw, LogOut, User } from "lucide-react";
import Header from "../../components/Header";
import NumericKeypad from "../../components/NumericKeypad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buscarEventos, buscarIngressos, buscarClientePorCpf, emitirIngressos, type Evento, type TipoIngresso, type Cliente } from "@/services/api";
import { Switch } from "@/components/ui/switch";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '@/styles/phone-input.css';
import { useEmissaoStore } from "@/store/emissaoStore";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext'
import { getUserEmpresaId, getCurrentUser } from '@/services/auth';
import { supabase } from '@/lib/supabase';

export default function PDVPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isEmitting, setEmitting } = useEmissaoStore();
  const [loading, setLoading] = useState(true);
  const [loadingIngressos, setLoadingIngressos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorIngressos, setErrorIngressos] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tiposIngresso, setTiposIngresso] = useState<TipoIngresso[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [eventoSelecionado, setEventoSelecionado] = useState<string>("");
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [tipoVenda, setTipoVenda] = useState<"local" | "online">("local");
  const [mostrarEmail, setMostrarEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState('br');
  const [submitting, setSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [searchingCPF, setSearchingCPF] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  // Estado para controlar se a empresa é promotora
  const [isPromoter, setIsPromoter] = useState(false);
  
  // Estado para controlar se a aplicação está inicializando
  const [initializing, setInitializing] = useState(true);
  
  // Estado para controlar se estamos verificando o companyId
  const [checkingCompanyId, setCheckingCompanyId] = useState(true);
  
  // Referência para o input de CPF
  const cpfInputRef = useRef<HTMLInputElement>(null);

  // Reset submitting state on mount
  useEffect(() => {
    setSubmitting(false);
    setEmitting(false);
  }, [setEmitting]);

  // Limpeza forçada do localStorage no carregamento da página
  useEffect(() => {
    // Função para forçar a limpeza do localStorage e obter o valor correto
    const forcarAtualizacaoInicial = async () => {
      try {
        // Verificar se o usuário está autenticado
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          return;
        }
        
        // Obter tokens de autenticação antes de limpar
        const accessToken = localStorage.getItem('sb-access-token');
        const refreshToken = localStorage.getItem('sb-refresh-token');
        const authStatus = localStorage.getItem('auth-status');
        
        // Remover especificamente o companyId e ultimoEventoSelecionado
        localStorage.removeItem('userCompanyId');
        localStorage.removeItem('ultimoEventoSelecionado');
        console.log("[INIT] Cache do companyId e do evento removidos para forçar valores corretos");
        
        // Restaurar tokens de autenticação se necessário
        if (accessToken) localStorage.setItem('sb-access-token', accessToken);
        if (refreshToken) localStorage.setItem('sb-refresh-token', refreshToken);
        if (authStatus) localStorage.setItem('auth-status', authStatus);
        
        // Resetar o estado de evento selecionado
        setEventoSelecionado("");
        
        // Não precisamos obter o companyId aqui, pois o useEffect de inicialização já fará isso
      } catch (error) {
        console.error("[INIT] Erro ao limpar cache:", error);
      }
    };
    
    // Executar a limpeza apenas uma vez ao montar o componente
    forcarAtualizacaoInicial();
  }, []); // Array de dependências vazio para executar apenas uma vez

  // Função para consultar o companyId no Supabase
  const buscarCompanyIdDoSupabase = async (): Promise<number | null> => {
    try {
      // Verificar sessão de usuário
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Erro ao verificar sessão:", sessionError);
        toast.error("Erro ao verificar sessão. Por favor, faça login novamente.");
        router.push("/login");
        return null;
      }
      
      if (!sessionData.session) {
        console.log("Sessão não encontrada, redirecionando para login");
        router.push("/login");
        return null;
      }
      
      const userId = sessionData.session.user.id;
      console.log("Usuário autenticado:", userId);
      
      // Buscar companyId e is_promoter da tabela users
      const { data, error } = await supabase
        .from('users')
        .select('companyId, is_promoter')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error("Erro ao buscar companyId do usuário:", error);
        toast.error("Erro ao identificar sua empresa. Tente novamente.");
        return null;
      }
      
      if (!data || data.companyId === undefined) {
        toast.error("Sua conta não tem uma empresa associada.");
        return null;
      }
      
      console.log("CompanyId encontrado na tabela users:", data.companyId);
      console.log("Is_promoter encontrado na tabela users:", data.is_promoter);
      
      // Atualizar o estado is_promoter
      setIsPromoter(data.is_promoter === true);
      
      // Retornar o ID da empresa
      return data.companyId;
    } catch (error) {
      console.error("Erro ao buscar companyId:", error);
      toast.error("Erro ao identificar sua empresa. Tente novamente.");
      return null;
    }
  };

  // Inicialização do companyId antes de qualquer coisa
  useEffect(() => {
    // Função imediata para carregar o companyId
    const carregarCompanyId = async () => {
      try {
        setCheckingCompanyId(true);
        
        // Verificar se o usuário está autenticado
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          console.log("Usuário não autenticado, redirecionando para login");
          router.push("/login");
          return;
        }
        
        // Verificar se o localStorage já tem o companyId
        const storedCompanyId = localStorage.getItem("userCompanyId");
        
        // Se já existir um companyId no localStorage, use-o para evitar consultas desnecessárias
        if (storedCompanyId) {
          console.log("Usando companyId do localStorage:", storedCompanyId);
          setCompanyId(parseInt(storedCompanyId));
          setCheckingCompanyId(false);
          setInitializing(false);
          return;
        }
        
        // Caso contrário, consulte o companyId diretamente no Supabase
        const idDaEmpresa = await buscarCompanyIdDoSupabase();
        
        if (idDaEmpresa) {
          console.log("ID da empresa obtido do Supabase:", idDaEmpresa);
          
          // Atualizar o localStorage e o estado
          localStorage.setItem("userCompanyId", idDaEmpresa.toString());
          setCompanyId(idDaEmpresa);
        } else {
          console.log("Não foi possível obter o ID da empresa, redirecionando para login");
          router.push("/login");
          return;
        }
        
        setCheckingCompanyId(false);
        setInitializing(false);
      } catch (error) {
        console.error("Erro ao carregar companyId:", error);
        router.push("/login");
      }
    };
    
    // Antes de iniciar, verificar se estamos na página PDV
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/pdv')) {
        // Só carregar o companyId se estivermos na página PDV
        carregarCompanyId();
      } else {
        // Não estamos na página PDV, não precisamos inicializar
        setCheckingCompanyId(false);
        setInitializing(false);
      }
    }
  }, [router]);

  // Carregar eventos somente depois que o companyId estiver definido
  useEffect(() => {
    if (checkingCompanyId || !companyId) return;
    
    const carregarEventos = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Carregando eventos com companyId:", companyId);
        const eventosData = await buscarEventos(companyId);
        setEventos(eventosData);
        
        // Pré-selecionar o primeiro evento automaticamente
        if (eventosData && eventosData.length > 0) {
          console.log("Selecionando automaticamente o primeiro evento:", eventosData[0].id);
          setEventoSelecionado(eventosData[0].id);
          // Salvar no localStorage
          localStorage.setItem("ultimoEventoSelecionado", eventosData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar eventos');
        toast.error("Erro ao carregar eventos. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    };

    carregarEventos();
  }, [companyId, checkingCompanyId]);

  // Carregar ingressos quando um evento for selecionado
  useEffect(() => {
    if (companyId === null || !eventoSelecionado) return;
    
    const carregarIngressos = async () => {
      try {
        setLoadingIngressos(true);
        setErrorIngressos(null);
        
        console.log(`Carregando ingressos para evento: ${eventoSelecionado}, companyId: ${companyId}`);
        
        const ingressosData = await buscarIngressos(eventoSelecionado, companyId);
        
        // Filtrar ingressos com base no flag isPromoter
        let ingressosFiltrados = ingressosData;
        if (isPromoter) {
          // Se for promotor, mostrar apenas ingressos gratuitos
          console.log("Modo promotor: filtrando apenas ingressos gratuitos");
          ingressosFiltrados = ingressosData.filter(ingresso => ingresso.preco === 0);
        } else {
          // Se não for promotor, mostrar apenas ingressos pagos (preço > 0)
          console.log("Modo PDV normal: filtrando apenas ingressos pagos");
          ingressosFiltrados = ingressosData.filter(ingresso => ingresso.preco > 0);
        }
        
        setTiposIngresso(ingressosFiltrados);
        
        // Selecionar automaticamente o primeiro ingresso se estiver disponível
        if (ingressosFiltrados && ingressosFiltrados.length > 0) {
          console.log("Selecionando automaticamente o primeiro ingresso:", ingressosFiltrados[0].id);
          setTipoSelecionado(String(ingressosFiltrados[0].id));
        } else {
          // Limpar a seleção de ingresso se não houver opções
          setTipoSelecionado("");
        }
      } catch (err) {
        console.error("Erro ao carregar ingressos:", err);
        
        // Se for erro relacionado ao evento não existir no companyId atual, apenas limpa e não mostra erro
        if (err instanceof Error && (
          err.message.includes('Não há ingressos disponíveis') || 
          err.message.includes('não disponível')
        )) {
          console.log("Evento possivelmente inválido no contexto atual, resetando seleção");
          setTipoSelecionado("");
          setEventoSelecionado("");
          // Também remove do localStorage
          localStorage.removeItem("ultimoEventoSelecionado");
        } else {
          // Mostrar erro apenas para problemas reais, não para eventos indisponíveis
          setErrorIngressos(err instanceof Error ? err.message : 'Erro ao carregar ingressos');
          toast.error("Erro ao carregar ingressos para este evento");
          setTipoSelecionado("");
        }
      } finally {
        setLoadingIngressos(false);
      }
    };
    
    carregarIngressos();
  }, [eventoSelecionado, companyId, isPromoter]);

  // Função para buscar cliente por CPF
  const buscarCliente = async (cpfValue: string) => {
    if (cpfValue.length < 11 || companyId === null) return; // Só busca se tiver 11 dígitos e companyId disponível

    try {
      setLoadingCliente(true);
      setErrorCliente(null);
      const clienteData = await buscarClientePorCpf(cpfValue, companyId);
      
      // Atualiza os campos com os dados do cliente
      if (clienteData.encontrado) {
        setNome(clienteData.nome);
        setDataNascimento(clienteData.nascimento);
        setCliente(clienteData);
        setErrorCliente(null);
      } else {
        // Se não encontrou, limpa os campos mas mantém o CPF
        setNome('');
        setDataNascimento('');
        setCliente(null);
        setErrorCliente('Cliente não encontrado no sistema');
      }
    } catch (err) {
      // Em caso de erro, limpa todos os campos
      setNome('');
      setDataNascimento('');
      setCliente(null);
      setErrorCliente(err instanceof Error ? err.message : 'Erro ao buscar cliente');
    } finally {
      setLoadingCliente(false);
    }
  };

  // Handler para mudança no CPF
  const handleCpfChange = (value: string) => {
    const formattedValue = formatarCPF(value);
    setCpf(formattedValue);
    
    // Remove formatação para verificar se tem 11 dígitos
    const cpfLimpo = formattedValue.replace(/\D/g, '');
    if (cpfLimpo.length === 11) {
      buscarCliente(cpfLimpo);
    } else {
      // Limpa os campos se o CPF estiver incompleto
      setNome('');
      setDataNascimento('');
      setCliente(null);
      setErrorCliente(null);
    }
  };

  // Função para limpar e refazer a busca
  const handleRefreshBusca = () => {
    if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, '');
      buscarCliente(cpfLimpo);
    }
  };

  const getPrecoUnitario = () => {
    const tipo = tiposIngresso.find((t) => t.id.toString() === tipoSelecionado);
    return tipo?.preco || 0;
  };

  const getTotal = () => {
    const precoUnitario = getPrecoUnitario();
    return precoUnitario * quantidade;
  };

  const formatarCPF = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatarTelefone = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const validarCPF = (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      setCpfError("CPF inválido");
      return false;
    }
    setCpfError("");
    return true;
  };

  const validarDataNascimento = (data: string) => {
    // Verifica se está no formato DD/MM/AAAA
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(data)) {
      return false;
    }

    const [dia, mes, ano] = data.split('/').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);

    // Verifica se é uma data válida
    return (
      dataObj.getDate() === dia &&
      dataObj.getMonth() === mes - 1 &&
      dataObj.getFullYear() === ano &&
      ano >= 1900 &&
      ano <= new Date().getFullYear()
    );
  };

  const formatarDataNascimento = (valor: string) => {
    // Remove caracteres não numéricos
    const numeros = valor.replace(/\D/g, '');
    
    // Aplica a máscara DD/MM/AAAA
    let dataFormatada = numeros;
    if (numeros.length >= 2) {
      dataFormatada = numeros.substring(0, 2) + '/' + numeros.substring(2);
    }
    if (numeros.length >= 4) {
      dataFormatada = dataFormatada.substring(0, 5) + '/' + numeros.substring(4, 8);
    }
    
    return dataFormatada;
  };

  const handleSubmit = async () => {
    // Se já está emitindo ou não tem companyId, não faz nada
    if (isEmitting || companyId === null) {
      if (companyId === null) {
        toast.error("ID da empresa não disponível. Por favor, faça login novamente.");
        router.push("/login");
      }
      return;
    }

    try {
      // Validações
      if (!eventoSelecionado) {
        toast.error("Selecione um evento");
        return;
      }

      if (!tipoSelecionado) {
        toast.error("Selecione um tipo de ingresso");
        return;
      }

      // Validações específicas baseadas no modo promotor ou normal
      if (isPromoter) {
        // No modo promotor, apenas o nome é obrigatório
        if (!nome) {
          toast.error("O nome é obrigatório");
          return;
        }
      } else {
        // No modo normal, todas as validações padrão
        if (!cpf || !validarCPF(cpf)) {
          toast.error("CPF inválido");
          return;
        }

        if (!nome || !telefone || !dataNascimento) {
          toast.error("Preencha todos os campos obrigatórios");
          return;
        }

        if (!validarDataNascimento(dataNascimento)) {
          toast.error("Data de nascimento inválida. Use o formato DD/MM/AAAA");
          return;
        }

        // Se o tipo de venda for online, email é obrigatório
        if (tipoVenda === "online" && !email) {
          toast.error("Email é obrigatório para vendas online");
          return;
        }
      }

      // Valores para modo promotor
      let clientPhone = telefone.replace(/\D/g, '');
      let clientCpf = cpf.replace(/\D/g, '');
      let clientEmail = email || undefined;
      let clientBirthDate = '';
      
      if (isPromoter) {
        // Use dados dummy para promotores
        const timestamp = Date.now();
        clientPhone = '9999999999999';
        clientCpf = '99999999999';
        clientEmail = `${timestamp}_cortesia@tixie.com.br`;
        clientBirthDate = '9999-99-99';
        
        // Sempre usar venda online para promotores
        setTipoVenda("online");
      } else {
        // Formata a data de nascimento para o formato correto (YYYY-MM-DD)
        const [dia, mes, ano] = dataNascimento.split('/');
        clientBirthDate = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }

      // Limpa dados de emissão anterior
      localStorage.removeItem("emissaoCompleta");
      localStorage.removeItem("ingressoEmitido");

      // Obtém o preço unitário do ingresso
      const tipoIngresso = tiposIngresso.find(tipo => tipo.id.toString() === tipoSelecionado);
      if (!tipoIngresso) {
        toast.error("Tipo de ingresso não encontrado");
        return;
      }

      // Prepara os dados para emissão usando os novos nomes de campo
      const dadosEmissao = {
        companyId: companyId,
        eventId: eventoSelecionado,
        ticketId: parseInt(tipoSelecionado),
        quantity: quantidade,
        clientPhone: clientPhone,
        clientDocument: clientCpf,
        clientDocumentType: 'CPF',
        clientName: nome,
        clientBirthDate: clientBirthDate,
        clientEmail: clientEmail,
        saleType: tipoVenda === "local" ? "local" : "online",
        unitPrice: tipoIngresso.preco,
        totalPrice: tipoIngresso.preco * quantidade
      };

      console.log("Dados para emissão:", dadosEmissao);

      // Salva os dados no localStorage
      localStorage.setItem("dadosEmissao", JSON.stringify(dadosEmissao));

      // Ativa o estado de emissão global
      setEmitting(true);

      // Redireciona para a página de loading
      router.push("/loading");

    } catch (error) {
      console.error("Erro ao preparar emissão:", error);
      toast.error("Erro ao preparar emissão do ingresso");
      setEmitting(false);
    }
  };

  const handleCPFKeypad = (number: string) => {
    const newValue = formatarCPF(cpf + number);
    if (newValue.length <= 14) {
      setCpf(newValue);
      validarCPF(newValue);
    }
  };

  const handleCPFBackspace = () => {
    const newValue = cpf.slice(0, -1);
    setCpf(newValue);
    validarCPF(newValue);
  };

  const handleTelefoneKeypad = (number: string) => {
    const newValue = formatarTelefone(telefone + number);
    if (newValue.length <= 15) {
      setTelefone(newValue);
    }
  };

  const handleTelefoneBackspace = () => {
    const newValue = telefone.slice(0, -1);
    setTelefone(newValue);
  };

  // Recupera os dados do formulário ao montar o componente
  useEffect(() => {
    // Não recupera mais o último evento usado - forçamos sempre selecionar um novo
    
    // Limpa apenas as chaves relacionadas à emissão de ingressos
    const keysToRemove = [
      'dadosEmissao', 
      'emissaoCompleta', 
      'ingressoEmitido', 
      'emissaoStatus', 
      'inicioProcessamento',
      'ultimoEventoSelecionado' // Adicionado para garantir que não use eventos antigos
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Reseta todos os estados para o valor inicial
    setEventoSelecionado("");
    setTipoSelecionado("");
    setQuantidade(1);
    setCpf("");
    setNome("");
    setDataNascimento("");
    setTelefone("");
    setEmail("");
    setMostrarEmail(false);
    setTipoVenda("local");
    setError(null);
    setErrorIngressos(null);
    setErrorCliente(null);
  }, []); // Este useEffect só deve rodar uma vez ao montar o componente

  // Função para realizar logout
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logout realizado com sucesso");
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  // Função para forçar a atualização do companyId
  const forcarAtualizacaoCompanyId = async () => {
    try {
      // Limpar o localStorage
      localStorage.removeItem('userCompanyId');
      console.log("Cache do companyId removido do localStorage");
      
      // Buscar novamente do Supabase
      const idDaEmpresa = await buscarCompanyIdDoSupabase();
      
      if (idDaEmpresa) {
        console.log("Novo ID da empresa obtido do Supabase:", idDaEmpresa);
        
        // Atualizar o localStorage e o estado
        localStorage.setItem("userCompanyId", idDaEmpresa.toString());
        setCompanyId(idDaEmpresa);
        
        // Forçar a recarga dos eventos
        const eventosData = await buscarEventos(idDaEmpresa);
        setEventos(eventosData);
        
        toast.success("CompanyID atualizado com sucesso!");
      } else {
        console.log("Não foi possível obter o ID da empresa");
        toast.error("Não foi possível obter o ID da empresa");
      }
    } catch (error) {
      console.error("Erro ao forçar atualização:", error);
      toast.error("Erro ao atualizar o ID da empresa");
    }
  };

  // Renderização condicional para mostrar tela de carregamento enquanto verifica o companyId
  if (checkingCompanyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-black/30 border border-white/10 backdrop-blur-lg rounded-lg p-8 max-w-md w-full flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Inicializando PDV</h1>
          <p className="text-center text-gray-300 mb-2">
            Consultando dados da sua empresa...
          </p>
          <p className="text-xs text-gray-400">Por favor, aguarde.</p>
        </div>
      </div>
    );
  }

  if (companyId === null) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-lg p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white">Identificando empresa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-lg p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white">Carregando eventos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: "url('/images/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
        <div className="backdrop-blur-xl bg-black/30 border border-red-500/20 rounded-lg p-8 shadow-2xl max-w-md w-full relative z-10">
          <div className="flex items-start gap-3 text-red-400">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium mb-2">Erro ao carregar eventos</h3>
              <p className="text-sm text-gray-300">{error}</p>
            </div>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: "url('/images/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 pointer-events-none" />
      
      <Header>
        <div className="flex justify-between items-center w-full">
          <h1 className="text-xl font-semibold text-white">PDV - Venda de Ingressos</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10">
              <User size={18} className="text-gray-300" />
              <span className="text-sm font-medium text-white">{user?.nome || "Usuário"}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1 bg-white/10 border-white/10 text-white hover:bg-white/20"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </Header>
      
      <div className="container mx-auto py-6 px-4 sm:px-6 relative z-10 max-w-7xl">
        {/* Exibe mensagem se estiver em modo de emissão */}
        {isEmitting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-full max-w-md border-none">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <RotateCw className="h-10 w-10 text-blue-500" />
                  </motion.div>
                  <h2 className="text-xl font-semibold">Emitindo ingressos...</h2>
                  <p className="text-center text-gray-500">
                    Por favor, aguarde enquanto os ingressos estão sendo emitidos.
                    Não feche ou atualize esta página.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div className="grid grid-cols-12 gap-6">
          {/* Formulário Principal */}
          <div className="col-span-12 lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-black/30 backdrop-blur-sm text-white border-white/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {isPromoter ? "Emissão de Cortesia" : "Venda de Ingresso"}
                  </CardTitle>
                </CardHeader>

                <form>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Campo Evento */}
                      <div className="space-y-2">
                        <Label className="text-gray-200">Evento</Label>
                        <Select value={eventoSelecionado} onValueChange={setEventoSelecionado}>
                          <SelectTrigger className="h-12 bg-black/30 border-white/10 text-white">
                            <SelectValue placeholder="Selecione o evento" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/90 backdrop-blur-xl border-white/10 text-white">
                            {eventos.map((evento) => (
                              <SelectItem
                                key={evento.id}
                                value={evento.id}
                                className="hover:bg-white/10"
                              >
                                {evento.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campo Tipo de Ingresso */}
                      <div className="space-y-2">
                        <Label className="text-gray-200">Tipo de Ingresso</Label>
                        <Select 
                          value={tipoSelecionado} 
                          onValueChange={setTipoSelecionado}
                          disabled={!eventoSelecionado || loadingIngressos}
                        >
                          <SelectTrigger className="h-12 bg-black/30 border-white/10 text-white">
                            <SelectValue placeholder={eventoSelecionado ? "Selecione o tipo de ingresso" : "Selecione um evento primeiro"} />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/90 backdrop-blur-xl border-white/10 text-white">
                            {tiposIngresso.map((tipo) => (
                              <SelectItem
                                key={tipo.id}
                                value={tipo.id.toString()}
                                className="hover:bg-white/10"
                              >
                                {tipo.nome} - R$ {tipo.preco.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {loadingIngressos && (
                          <div className="flex items-center justify-center mt-2">
                            <div className="w-4 h-4 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="ml-2 text-sm text-gray-400">Carregando ingressos...</span>
                          </div>
                        )}
                      </div>

                      {/* Campo Quantidade (visível para todos) */}
                      <div className="space-y-2">
                        <Label className="text-gray-200">Quantidade</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => quantidade > 1 && setQuantidade(quantidade - 1)}
                            className="bg-black/30 border-white/10 text-white hover:bg-white/10"
                          >
                            -
                          </Button>
                          <span className="w-12 text-center text-white">{quantidade}</span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setQuantidade(quantidade + 1)}
                            className="bg-black/30 border-white/10 text-white hover:bg-white/10"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Modo promotor: mostra apenas o campo nome */}
                      {isPromoter ? (
                        <div className="space-y-2">
                          <Label className="text-gray-200">Nome</Label>
                          <Input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="h-12 bg-black/30 border-white/10 text-white"
                            placeholder="Nome completo"
                          />
                        </div>
                      ) : (
                        /* Campos para modo normal */
                        <>
                          {/* Campo Telefone */}
                          <div className="space-y-2">
                            <Label htmlFor="telefone" className="text-gray-200">Telefone</Label>
                            <div className="relative rounded-md overflow-hidden border border-white/10">
                              <PhoneInput
                                country="br"
                                value={telefone}
                                onChange={(value) => setTelefone(value)}
                                inputProps={{
                                  id: "telefone",
                                  required: true,
                                  className: "w-full !bg-black/30 !border-0 !text-white !h-12 !pl-12"
                                }}
                                containerClass="!bg-transparent"
                                buttonClass="!bg-black/30 !border-0 !border-r !border-white/10"
                                dropdownClass="!bg-gray-900/90 !border-white/10"
                                enableSearch={false}
                                disableSearchIcon={true}
                                preferredCountries={['br']}
                                disableCountryCode={false}
                                countryCodeEditable={false}
                              />
                            </div>
                          </div>

                          {/* Campo CPF */}
                          <div className="space-y-2">
                            <Label className="text-gray-200">CPF</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={cpf}
                                onChange={(e) => handleCpfChange(e.target.value)}
                                className="h-12 bg-black/30 border-white/10 text-white"
                                placeholder="000.000.000-00"
                                disabled={loadingCliente}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleRefreshBusca}
                                disabled={loadingCliente || !cpf}
                                className="h-12 w-12 bg-black/30 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
                              >
                                <RotateCw className={`h-5 w-5 ${loadingCliente ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                            {loadingCliente && (
                              <p className="text-sm text-blue-400">Buscando dados do cliente...</p>
                            )}
                            {errorCliente && (
                              <p className="text-sm text-red-400">{errorCliente}</p>
                            )}
                          </div>

                          {/* Campo Nome */}
                          <div className="space-y-2">
                            <Label className="text-gray-200">Nome</Label>
                            <Input
                              type="text"
                              value={nome}
                              onChange={(e) => setNome(e.target.value)}
                              className="h-12 bg-black/30 border-white/10 text-white"
                              placeholder="Nome completo"
                              disabled={loadingCliente}
                            />
                          </div>

                          {/* Campo Data de Nascimento */}
                          <div className="space-y-2">
                            <Label className="text-gray-200">Data de Nascimento</Label>
                            <Input
                              type="text"
                              value={dataNascimento}
                              onChange={(e) => {
                                const valor = formatarDataNascimento(e.target.value);
                                if (valor.length <= 10) {
                                  setDataNascimento(valor);
                                }
                              }}
                              className="h-12 bg-black/30 border-white/10 text-white"
                              placeholder="DD/MM/AAAA"
                              maxLength={10}
                              disabled={loadingCliente}
                            />
                          </div>

                          {/* Campo Email */}
                          <div className="space-y-2">
                            <Label className="text-gray-200">Email</Label>
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="h-12 bg-black/30 border-white/10 text-white"
                              placeholder="exemplo@email.com"
                            />
                          </div>

                          {/* Tipo de Venda */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-white/10">
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium text-white">Tipo de Venda</h4>
                                <p className="text-sm text-gray-400">
                                  {tipoVenda === "local" ? "Venda no local do evento" : "Venda online"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Local</span>
                                <Switch
                                  checked={tipoVenda === "online"}
                                  onCheckedChange={(checked: boolean) => setTipoVenda(checked ? "online" : "local")}
                                  className="data-[state=checked]:bg-blue-600"
                                />
                                <span className="text-sm text-gray-400">Online</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </form>
              </Card>
            </motion.div>
          </div>

          {/* Resumo do Pedido (Fixo) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-[88px]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-lg p-6 space-y-4 shadow-2xl"
              >
                <h3 className="text-xl font-semibold text-white">Resumo do Pedido</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-200">
                    <span>Valor unitário:</span>
                    <span className="font-medium">R$ {getPrecoUnitario().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-200">
                    <span>Quantidade:</span>
                    <span className="font-medium">{quantidade}</span>
                  </div>
                  <div className="border-t border-white/10 my-2" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-white">Total:</span>
                    <span className="text-blue-400">
                      R$ {getTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isEmitting || !eventoSelecionado || !tipoSelecionado || 
                    (isPromoter ? !nome : (!cpf || !nome || !telefone || !dataNascimento || (tipoVenda === "online" && !email)))}
                  className="w-full h-12 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium transition-all duration-200 shadow-md"
                >
                  {isEmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Processando...</span>
                    </div>
                  ) : (
                    "Emitir Ingresso"
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 