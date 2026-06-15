// types/index.ts
// Ponto de entrada único para os tipos do Sollyd.

export * from './transaction'
// entities.ts redefine Wallet/Payer/Category/Subcategory/Classification com outra forma
// (usadas no módulo de cadastros). Para o barrel, transaction.ts é a canônica;
// reexporta apenas o tipo exclusivo de entities. Quem precisa da forma de cadastros
// importa direto de '@/types/entities'.
export type { Beneficiary } from './entities'
export * from './time-range'
export * from './budget'
export * from './savings-box'
export * from './investment'
