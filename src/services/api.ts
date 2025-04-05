interface EventoItem {
  name: {
    en: string;
  };
  slug: string;
  date_from: string;
  date_to: string;
  currency: string;
  public_url: string;
  live: boolean;
  testmode: boolean;
}

interface EventoResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EventoItem[];
}

export interface Evento {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  moeda: string;
  url: string;
}

interface IngressoResponse {
  active: boolean;
  tickets?: {
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<{
      id: number;
      name: {
        en: string;
      };
      default_price: string;
      description: {
        en?: string;
      };
      active: boolean;
      admission: boolean;
      position: number;
      checkin_attention: boolean;
      bundles: Array<{
        bundled_item: number;
        count: number;
        designated_price: string;
      }>;
    }>;
  };
}

export interface TipoIngresso {
  id: number;
  nome: string;
  preco: number;
  descricao?: string;
  posicao: number;
  atencaoCheckin: boolean;
  bundle?: {
    quantidade: number;
    precoDesignado: number;
  };
}

export async function buscarEventos(companyId: number): Promise<Evento[]> {
  try {
    // Usar a rota API local em vez do webhook direto
    const response = await fetch('/api/eventos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar eventos: ${response.status}`);
    }

    const data = await response.json() as EventoResponse;
    
    // Se não houver eventos
    if (!data || data.count === 0 || !data.results) {
      throw new Error('Não há eventos disponíveis no momento');
    }

    // Mapeia os eventos para o formato que a aplicação utiliza
    return data.results.map(evento => ({
      id: evento.slug,
      nome: evento.name.en,
      dataInicio: evento.date_from,
      dataFim: evento.date_to,
      moeda: evento.currency,
      url: evento.public_url,
    }));

  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Erro desconhecido ao buscar eventos');
  }
}

export async function buscarIngressos(eventId: string, companyId: number): Promise<TipoIngresso[]> {
  try {
    // Usar a rota API local em vez do webhook direto
    const response = await fetch('/api/ingressos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId, companyId }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar ingressos: ${response.status}`);
    }

    const data = await response.json() as IngressoResponse;
    
    // Verifica se há dados e se está ativo
    if (!data || !data.active) {
      throw new Error('Não há ingressos disponíveis para este evento');
    }

    const ingressosData = data.tickets;
    if (!ingressosData || !ingressosData.results || ingressosData.results.length === 0) {
      throw new Error('Não há ingressos disponíveis para este evento');
    }

    // Mapeia os ingressos para o formato que a aplicação utiliza
    return ingressosData.results
      .filter(ingresso => ingresso.active) // Filtra apenas ingressos ativos
      .map(ingresso => ({
        id: ingresso.id,
        nome: ingresso.name.en,
        preco: parseFloat(ingresso.default_price),
        descricao: ingresso.description?.en,
        posicao: ingresso.position,
        atencaoCheckin: ingresso.checkin_attention,
        ...(ingresso.bundles && ingresso.bundles.length > 0 && {
          bundle: {
            quantidade: ingresso.bundles[0].count,
            precoDesignado: parseFloat(ingresso.bundles[0].designated_price),
          }
        }),
      }))
      .sort((a, b) => a.posicao - b.posicao); // Ordena por posição

  } catch (error) {
    console.error('Erro ao buscar ingressos:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Erro desconhecido ao buscar ingressos');
  }
}

interface ClienteResponse {
  nome: string;
  nascimento: string;
  error: string;
}

export interface Cliente {
  nome: string;
  nascimento: string;
  encontrado: boolean;
}

export async function buscarClientePorCpf(cpf: string, companyId: number): Promise<Cliente> {
  try {
    // Remove caracteres não numéricos do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Usar a rota API local em vez do webhook direto
    const response = await fetch('/api/cliente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cpf: cpfLimpo, companyId }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar cliente: ${response.status}`);
    }

    const data = await response.json() as ClienteResponse;
    
    // Verifica se os dados são válidos
    if (!data || typeof data.error === 'undefined') {
      console.log('Resposta da API:', data); // Para debug
      return {
        nome: '',
        nascimento: '',
        encontrado: false
      };
    }

    // Verifica se o cliente foi encontrado
    const encontrado = data.error === "0";
    
    return {
      nome: encontrado ? (data.nome || '') : '',
      nascimento: encontrado ? (data.nascimento || '') : '',
      encontrado
    };

  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return {
      nome: '',
      nascimento: '',
      encontrado: false
    };
  }
}

interface EmissaoIngressoPayload {
  companyId: number;
  eventId: string;
  ticketId: number;
  quantity: number;
  clientPhone: string;
  clientDocument: string;
  clientDocumentType: string;
  clientName: string;
  clientBirthDate: string;
  clientEmail?: string;
  saleType: "local" | "online";
  unitPrice: number;
  totalPrice: number;
}

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

export async function emitirIngressos(dados: EmissaoIngressoPayload): Promise<IngressoEmitido> {
  try {
    console.log("Enviando dados para emissão:", dados);

    // Usar a rota API local em vez do webhook direto
    const response = await fetch('/api/emissao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na resposta da API:", errorText);
      throw new Error(`Erro ao emitir ingressos: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Resposta da API:", data);
    
    // Mapeia a resposta para o formato esperado
    const ingressoEmitido: IngressoEmitido = {
      code: data.code,
      status: data.status,
      email: data.email,
      phone: data.phone,
      total: data.total,
      url: data.url,
      positions: data.positions.map((pos: any) => ({
        id: pos.id,
        attendee_name: pos.attendee_name,
        downloads: pos.downloads
      })),
      downloads: data.downloads
    };

    return ingressoEmitido;

  } catch (error) {
    console.error('Erro ao emitir ingressos:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Erro desconhecido ao emitir ingressos');
  }
} 