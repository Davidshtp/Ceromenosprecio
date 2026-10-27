export type WhatsAppContext =
  | { type: "menu_contact"; restaurantName: string }
  | { type: "order_preparing"; customerName: string; orderNumber: string | number }
  | { type: "order_delivery_ready"; customerName: string; orderNumber: string | number }
  | { type: "order_pickup_ready"; customerName: string; orderNumber: string | number };

const MENU_CONTACT_TEMPLATES = [
  "¡Quiubo, pues! 😈🍟 Ando viendo esas salchipapas tan groseras de {nombre} y necesito resolver una duda antes de pecar. 🔥",
];

const ORDER_PREPARING_TEMPLATES = [
  "¡Pilas, {nombre}! 👀🔥 Tu pedido #{número} ya se está cocinando. Aquí estamos metiéndole toda la ficha para que te llegue una chimba de salchipapa. 🍟🤤 ¡Aguantá un tris, que lo bueno se hace con ganas!",
  "¡Ey, {nombre}! 🔥🍟 Tu pedido #{número} ya está en la candela. Estamos armando esa grosería como Dios manda, sin miedo y sin tacañearle a ni mierda. 😈🤤 ¡Ya casi te avisamos!",
  "¡{nombre}, no desesperés! 😈🍟 Tu pedido #{número} ya está en proceso. Estamos preparando esa hijueputa delicia para que te chupés hasta los dedos. 🔥🤤 ¡Ya casi!",
];

const ORDER_DELIVERY_READY_TEMPLATES = [
  "¡{nombre}, alístese pues! 🔥🛵 Su pedido #{número} ya salió para donde usted. Esa grosería de salchipapa va en camino para acabar con ese hambre tan hijueputa. 🍟😈 ¡Pendiente, que ya casi llega!",
  "¡Parce, llegó la hora! 🤤🔥 Tu pedido #{número} ya va en camino. Alistá la mesa, soltá el celular un ratico y preparate para recibir esa bestialidad de papas. 🍟💣 ¡Cero tacañería hasta la puerta de tu casa!",
];

const ORDER_PICKUP_READY_TEMPLATES = [
  "¡Quiubo, {nombre}! 🔥🍟 Su pedido #{número} ya quedó listo. Caiga pues por esa chimba de salchipapa, que aquí lo estamos esperando con toda. 🤤😈",
  "¡{nombre}, misión cumplida! 💣🍟 Su pedido #{número} ya está listo para recoger. Lo hicimos sin contemplaciones y con cero tacañería. Ahora le toca a usted hacerle los honores. 😈🔥",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildWhatsAppMessage(ctx: WhatsAppContext): string {
  let template: string;
  let vars: Record<string, string>;

  switch (ctx.type) {
    case "menu_contact":
      template = pickRandom(MENU_CONTACT_TEMPLATES);
      vars = { nombre: ctx.restaurantName || "Cero Menosprecio" };
      break;
    case "order_preparing":
      template = pickRandom(ORDER_PREPARING_TEMPLATES);
      vars = {
        nombre: ctx.customerName || "cliente",
        número: String(ctx.orderNumber),
      };
      break;
    case "order_delivery_ready":
      template = pickRandom(ORDER_DELIVERY_READY_TEMPLATES);
      vars = {
        nombre: ctx.customerName || "cliente",
        número: String(ctx.orderNumber),
      };
      break;
    case "order_pickup_ready":
      template = pickRandom(ORDER_PICKUP_READY_TEMPLATES);
      vars = {
        nombre: ctx.customerName || "cliente",
        número: String(ctx.orderNumber),
      };
      break;
  }

  return template.replace(/\{nombre\}/g, vars.nombre).replace(/\{número\}/g, vars["número"]);
}
