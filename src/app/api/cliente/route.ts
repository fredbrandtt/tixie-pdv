import { NextRequest, NextResponse } from 'next/server';

// Função auxiliar para adicionar headers CORS
function corsHeaders(response: Response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Rota OPTIONS para lidar com preflight requests
export async function OPTIONS() {
  return corsHeaders(new Response(null, { status: 200 }));
}

/**
 * Rota proxy para evitar problemas de CORS ao buscar clientes
 */
export async function POST(request: NextRequest) {
  try {
    // Obter os dados da requisição
    const requestData = await request.json();
    
    console.log('[API] Proxy de cliente recebeu requisição:', requestData);
    
    // Validar os dados recebidos
    if (!requestData.cpf) {
      console.error('[API] Parâmetro inválido para busca de cliente');
      return NextResponse.json(
        { error: 'Parâmetro inválido. É necessário fornecer o CPF.' },
        { status: 400 }
      );
    }
    
    // Construir a URL do webhook
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_CLIENTE;
    if (!webhookUrl) {
      console.error('[API] URL do webhook de cliente não configurada');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta. URL do webhook não definida.' },
        { status: 500 }
      );
    }
    
    console.log(`[API] Encaminhando requisição para webhook: ${webhookUrl}`);
    
    // Encaminhar a requisição para o webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData),
    });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorStatus = response.status;
      const errorText = await response.text();
      console.error(`[API] Erro na resposta do webhook (${errorStatus}): ${errorText}`);
      return NextResponse.json(
        { error: `Erro ao buscar dados do serviço externo: ${errorStatus}` },
        { status: errorStatus }
      );
    }
    
    // Processar e retornar a resposta
    const data = await response.json();
    console.log('[API] Resposta do webhook recebida com sucesso');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Erro no proxy de cliente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao processar a requisição de cliente' },
      { status: 500 }
    );
  }
} 