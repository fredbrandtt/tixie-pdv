/**
 * Interface que define a estrutura de um Evento na aplicação
 */
export interface Evento {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  status: string;
  moeda?: string;
  url?: string;
} 