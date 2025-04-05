import { NextRequest, NextResponse } from 'next/server';

/**
 * Rota proxy para evitar problemas de CORS ao buscar ingressos
 */
export async function POST(request: NextRequest) {
  try {
    // Obter os dados da requisição
    const requestData = await request.json();
    
    console.log('[API] Proxy de ingressos recebeu requisição:', requestData);
    
    // Validar os dados recebidos
    if (!requestData.eventId || !requestData.companyId) {
      console.error('[API] Parâmetros inválidos para busca de ingressos');
      return NextResponse.json(
        { error: 'Parâmetros inválidos. É necessário fornecer eventId e companyId.' },
        { status: 400 }
      );
    }
    
    // Construir a URL do webhook
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_INGRESSOS;
    if (!webhookUrl) {
      console.error('[API] URL do webhook de ingressos não configurada');
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
    console.error('[API] Erro no proxy de ingressos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao processar a requisição de ingressos' },
      { status: 500 }
    );
  }
} 