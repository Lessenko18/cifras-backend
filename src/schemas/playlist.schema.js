import { z } from "zod";

// Corpo de compartilhar/descompartilhar: antes um `emails` que não fosse array
// estourava TypeError (500) dentro do service.
export const shareEmailsSchema = z.object({
  emails: z
    .array(z.string().trim().max(200, "E-mail inválido"), {
      required_error: "Informe os e-mails",
      invalid_type_error: "Informe os e-mails em uma lista",
    })
    .min(1, "Informe ao menos um e-mail")
    .max(50, "No máximo 50 e-mails por vez"),
});
