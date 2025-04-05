import { NextRequest, NextResponse } from 'next/server';

// Função auxiliar para adicionar headers CORS
function corsHeaders(response: Response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Transaction-ID');
  return response;
}

// Rota OPTIONS para lidar com preflight requests
export async function OPTIONS() {
  return corsHeaders(new Response(null, { status: 200 }));
}

/**
 * Rota proxy para evitar problemas de CORS ao emitir ingressos
 */
export async function POST(request: NextRequest) {
  try {
    // Obter os dados da requisição
    const requestData = await request.json();
    
    console.log('[API] Proxy de emissão recebeu requisição:', JSON.stringify(requestData, null, 2));
    
    // Validar os dados recebidos
    const requiredFields = ['eventId', 'ticketId', 'clientName', 'clientDocument'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      console.error(`[API] Parâmetros inválidos para emissão: faltando ${missingFields.join(', ')}`);
      return NextResponse.json(
        { 
          error: 'Parâmetros inválidos para emissão de ingresso', 
          missingFields 
        },
        { status: 400 }
      );
    }
    
    // Construir a URL do webhook
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_EMISSAO;
    if (!webhookUrl) {
      console.error('[API] URL do webhook de emissão não configurada');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta. URL do webhook não definida.' },
        { status: 500 }
      );
    }
    
    console.log(`[API] Encaminhando requisição para webhook: ${webhookUrl}`);
    
    // Adaptar o formato dos dados para o esperado pelo webhook
    const webhookData = {
      companyId: requestData.companyId,
      eventId: requestData.eventId,
      product_id: requestData.ticketId,
      qtd: requestData.quantity || 1,
      name: requestData.clientName,
      cpf: requestData.clientDocument,
      birthday: requestData.clientBirthDate,
      phone: requestData.clientPhone,
      email: requestData.clientEmail,
      sales_channel: requestData.saleType === 'local' ? 'pdv' : 'web',
      transactionId: Date.now().toString(), // Gera um ID de transação único
      unitPrice: requestData.unitPrice,
      totalPrice: requestData.totalPrice
    };
    
    console.log('[API] Dados adaptados para o webhook:', JSON.stringify(webhookData, null, 2));
    
    // Encaminhar a requisição para o webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Transaction-ID': webhookData.transactionId
      },
      body: JSON.stringify(webhookData),
    });
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorStatus = response.status;
      let errorText;
      try {
        errorText = await response.text();
        console.error(`[API] Erro na resposta do webhook (${errorStatus}): ${errorText}`);
      } catch (e) {
        errorText = "Erro ao ler resposta";
        console.error(`[API] Erro na resposta do webhook (${errorStatus}) e erro ao ler texto da resposta`);
      }
      
      return NextResponse.json(
        { error: `Erro ao emitir ingresso: ${errorStatus}`, details: errorText },
        { status: errorStatus }
      );
    }
    
    // Processar e retornar a resposta
    const data = await response.json();
    console.log('[API] Resposta do webhook de emissão recebida com sucesso:', JSON.stringify(data, null, 2));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Erro no proxy de emissão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao processar a requisição de emissão de ingresso', details: String(error) },
      { status: 500 }
    );
  }
} 