"use client";

import { useState, useEffect } from "react";
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

  // Reset submitting state on mount
  useEffect(() => {
    setSubmitting(false);
    setEmitting(false);
  }, [setEmitting]);

  // Carrega os eventos ao montar o componente
  useEffect(() => {
    const carregarEventos = async () => {
      try {
        setLoading(true);
        setError(null);
        const eventosData = await buscarEventos(1);
        setEventos(eventosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar eventos');
      } finally {
        setLoading(false);
      }
    };

    carregarEventos();
  }, []);

  // Carrega os ingressos quando um evento é selecionado
  useEffect(() => {
    const carregarIngressos = async () => {
      if (!eventoSelecionado) {
        setTiposIngresso([]);
        setTipoSelecionado("");
        return;
      }

      try {
        setLoadingIngressos(true);
        setErrorIngressos(null);
        const ingressosData = await buscarIngressos(eventoSelecionado, 1);
        setTiposIngresso(ingressosData);
      } catch (err) {
        setErrorIngressos(err instanceof Error ? err.message : 'Erro ao carregar ingressos');
        setTiposIngresso([]);
      } finally {
        setLoadingIngressos(false);
      }
    };

    carregarIngressos();
  }, [eventoSelecionado]);

  // Recupera o último evento selecionado
  useEffect(() => {
    const ultimoEvento = localStorage.getItem("ultimoEventoSelecionado");
    if (ultimoEvento) {
      setEventoSelecionado(ultimoEvento);
    }
  }, []);

  // Salva o evento selecionado
  useEffect(() => {
    if (eventoSelecionado) {
      localStorage.setItem("ultimoEventoSelecionado", eventoSelecionado);
    }
  }, [eventoSelecionado]);

  // Função para buscar cliente por CPF
  const buscarCliente = async (cpfValue: string) => {
    if (cpfValue.length < 11) return; // Só busca se tiver 11 dígitos

    try {
      setLoadingCliente(true);
      setErrorCliente(null);
      const clienteData = await buscarClientePorCpf(cpfValue, 1);
      
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
    // Se já está emitindo, não faz nada
    if (isEmitting) {
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

      // Formata a data de nascimento para o formato correto (YYYY-MM-DD)
      const [dia, mes, ano] = dataNascimento.split('/');
      const dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

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
        companyId: 1,
        eventId: eventoSelecionado,
        ticketId: parseInt(tipoSelecionado),
        quantity: quantidade,
        clientPhone: telefone.replace(/\D/g, ''),
        clientDocument: cpf.replace(/\D/g, ''),
        clientDocumentType: 'CPF',
        clientName: nome,
        clientBirthDate: dataFormatada,
        clientEmail: email || undefined,
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
    // Limpa todo o localStorage exceto o último evento selecionado
    const ultimoEvento = localStorage.getItem("ultimoEventoSelecionado");
    
    // Limpa todo o localStorage
    localStorage.clear();

    // Restaura apenas o último evento selecionado
    if (ultimoEvento) {
      localStorage.setItem("ultimoEventoSelecionado", ultimoEvento);
      setEventoSelecionado(ultimoEvento);
    } else {
      setEventoSelecionado("");
    }

    // Reseta todos os estados para o valor inicial
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-lg p-8 shadow-2xl">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-black/30 border border-red-500/20 rounded-lg p-8 shadow-2xl max-w-md w-full">
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header>
        <div className="flex justify-between items-center w-full">
          <h1 className="text-xl font-semibold">PDV - Venda de Ingressos</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-800 px-3 py-1.5 rounded-md">
              <User size={18} className="text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium">{user?.nome || "Usuário"}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </Header>
      
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Formulário Principal */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl">
                <CardHeader>
                  <h1 className="text-2xl font-bold text-center text-white">
                    Venda de Ingressos
                  </h1>
                </CardHeader>
                <form>
                  <CardContent className="space-y-6">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Campo Evento */}
                      <div className="space-y-2">
                        <Label className="text-gray-200">Evento</Label>
                        <Select value={eventoSelecionado} onValueChange={setEventoSelecionado}>
                          <SelectTrigger className="h-14 bg-white/10 border-white/20 text-white">
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
                          disabled={loadingIngressos || !!errorIngressos}
                        >
                          <SelectTrigger className="h-14 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder={
                              loadingIngressos 
                                ? "Carregando ingressos..." 
                                : errorIngressos 
                                  ? errorIngressos 
                                  : "Selecione o tipo"
                            } />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/90 backdrop-blur-xl border-white/10 text-white">
                            {tiposIngresso.map((tipo) => (
                              <SelectItem
                                key={tipo.id}
                                value={tipo.id.toString()}
                                className="hover:bg-white/10"
                              >
                                <div className="flex flex-col">
                                  <span>{tipo.nome} - R$ {tipo.preco.toFixed(2)}</span>
                                  {tipo.descricao && (
                                    <span className="text-sm text-gray-400">{tipo.descricao}</span>
                                  )}
                                  {tipo.bundle && (
                                    <span className="text-sm text-emerald-400">
                                      {tipo.bundle.quantidade}x ingressos
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorIngressos && (
                          <span className="text-sm text-red-400">{errorIngressos}</span>
                        )}
                      </div>

                      {/* Campo Quantidade */}
                      <div className="space-y-2">
                        <Label className="text-gray-200">Quantidade</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => quantidade > 1 && setQuantidade(quantidade - 1)}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            -
                          </Button>
                          <span className="w-12 text-center text-white">{quantidade}</span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setQuantidade(quantidade + 1)}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Campo Telefone */}
                      <div className="space-y-2">
                        <Label htmlFor="telefone" className="text-sm font-medium text-white">
                          Telefone
                        </Label>
                        <PhoneInput
                          country="br"
                          value={telefone}
                          onChange={(value) => setTelefone(value)}
                          inputProps={{
                            id: "telefone",
                            required: true
                          }}
                          enableSearch
                          searchPlaceholder="Buscar país..."
                          searchNotFound="País não encontrado"
                          preferredCountries={['br', 'us', 'pt']}
                          disableCountryCode={false}
                          countryCodeEditable={false}
                        />
                      </div>

                      {/* Campo CPF */}
                      <div className="space-y-2">
                        <Label className="text-gray-200">CPF</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={cpf}
                            onChange={(e) => handleCpfChange(e.target.value)}
                            className="h-14 bg-white/10 border-white/20 text-white"
                            placeholder="000.000.000-00"
                            disabled={loadingCliente}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleRefreshBusca}
                            disabled={loadingCliente || !cpf}
                            className="h-14 w-14 bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
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
                          className="h-14 bg-white/10 border-white/20 text-white"
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
                          className="h-14 bg-white/10 border-white/20 text-white"
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
                          className="h-14 bg-white/10 border-white/20 text-white"
                          placeholder="exemplo@email.com"
                        />
                      </div>

                      {/* Tipo de Venda */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
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
                    </div>
                  </CardContent>
                </form>
              </Card>
            </motion.div>
          </div>

          {/* Resumo do Pedido (Fixo) */}
          <div className="w-full lg:w-[400px]">
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
                  <div className="flex justify-between text-lg font-semibold text-white">
                    <span>Total:</span>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      R$ {getTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isEmitting || !eventoSelecionado || !tipoSelecionado || !cpf || !nome || !telefone || !dataNascimento || (tipoVenda === "online" && !email)}
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300 shadow-xl shadow-purple-500/20 border border-white/10 mt-4"
                >
                  {isEmitting ? (
                    <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
} 