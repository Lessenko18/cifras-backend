// Papéis de acesso. Plano/assinatura NÃO é papel: vai em outra camada (entitlements),
// para "ADM" continuar significando só "administra o app".
export const ROLES = Object.freeze({ USER: "USER", ADM: "ADM" });
export const ROLE_VALUES = Object.freeze(Object.values(ROLES));
