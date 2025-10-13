// Config global SOLO para iOS (no afecta Android)
export const IOS_BACK_BUTTON_CONFIG = {
  ICON_SIZE: 20,          // ← cambia a 22 y sube en TODAS las pantallas iOS
  BUBBLE_PADDING: 10,     // padding interno del globo
  TOP_OFFSET: 6,          // se suma al safe-area top (debajo del notch)
  LEFT_OFFSET: 12,        // separación del borde izquierdo
  BACKGROUND: 'rgba(0,0,0,0.65)', // fondo del globo
  BORDER_COLOR: '#D8A353',        // pon null para sin borde
  BORDER_WIDTH: 1,
  SHADOW: true,           // sombra suave
};
