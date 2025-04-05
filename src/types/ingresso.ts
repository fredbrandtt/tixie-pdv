/**
 * Interface que define a estrutura de um TipoIngresso na aplicação
 */
export interface TipoIngresso {
  id: string | number;
  nome: string;
  preco: number;
  descricao?: string;
  posicao?: number;
  atencaoCheckin?: boolean;
  bundle?: {
    quantidade: number;
    precoDesignado: number;
  };
} 