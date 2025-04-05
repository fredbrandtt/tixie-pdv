/**
 * Interface que define a estrutura de um Cliente na aplicação
 */
export interface Cliente {
  nome: string;
  cpf: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  
  // Para compatibilidade com versões anteriores
  nascimento?: string;
  encontrado?: boolean;
} 