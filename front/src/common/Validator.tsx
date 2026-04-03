export class Validator {
  // Normaliza espacios: elimina espacios al inicio y fin, convierte múltiples espacios en uno solo
  static normalizeSpaces(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  // Capitaliza la primera letra de cada palabra
  static capitalizeWords(text: string): string {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Valida nombres personales (solo letras y espacios) y capitaliza cada palabra
  static validatenames(name: string): string {
    const normalized = this.normalizeSpaces(name);
    if (!normalized) return "El nombre es requerido";
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(normalized)) return "Solo letras y espacios permitidos";
    return "";
  }

  // Normaliza nombres: trim, espacios múltiples y capitaliza
  static normalizeName(name: string): string {
    const normalized = this.normalizeSpaces(name);
    return this.capitalizeWords(normalized);
  }

  // Valida nombre de usuario (solo requerido)
  static validateUsername(username: string): string {
    if (!username.trim()) return "El nombre de usuario es requerido";
    return "";
  }

  // Valida nombre de empresa/institucións
  static validateCompanyName(name: string): string {
    const normalized = this.normalizeSpaces(name);
    if (!normalized) return "El nombre de la empresa es requerido";
    return "";
  }

  // Valida NIT (alfanumérico básico, requerido)
  static validateNIT(nit: string): string {
    const normalized = nit.trim(); // NIT no debería tener espacios internos
    if (!normalized) return "El NIT es obligatorio";
    if (!/^[0-9\-]{5,20}$/.test(normalized)) return "NIT inválido";
    return "";
  }

  // Valida correo electrónico (formato general)
  static validateEmail(email: string): string {
    const normalized = email.trim().toLowerCase(); // Email sin espacios y en minúsculas
    if (!normalized) return "El correo es requerido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "Formato de correo inválido";
    return "";
  }

  /**
   * Valida teléfono para Bolivia, Perú o Chile
   * Detecta automáticamente el país del número
   * @param phone - Número telefónico
   * @returns Mensaje de error o string vacío si es válido
   */
  static validatePhone(phone: string): string {
    if (!phone.trim()) return "El teléfono es requerido";
    
    // Normalizar quitando espacios, guiones, paréntesis
    const normalized = phone.replace(/[\s\-().]/g, '');
    
    // Validar formato general: 8-15 dígitos con posible +
    if (!/^(\+)?[0-9]{8,15}$/.test(normalized)) {
      return "Teléfono inválido";
    }

    // Validar que sea de Bolivia (+591, 591, 91), Perú (+51, 51) o Chile (+56, 56)
    const isBolivia = /^(\+591|591|91)[0-9]{7,8}$/.test(normalized);
    const isPeru = /^(\+51|51)[0-9]{8,9}$/.test(normalized);
    const isChile = /^(\+56|56)[0-9]{7,8}$/.test(normalized);

    if (!isBolivia && !isPeru && !isChile) {
      return "Teléfono debe ser de Bolivia (+591), Perú (+51) o Chile (+56)";
    }

    return "";
  }

  // Valida contraseña (mínimo 8 caracteres, una mayúscula y un número)
  static validatePassword(password: string): string {
    // La contraseña NO se trimea ni normaliza, se valida tal cual
    if (!password) return "La contraseña es requerida";
    if (/\s/.test(password)) return "La contraseña no puede contener espacios";
    if (password.length < 8) return "Debe tener al menos 8 caracteres";
    if (!/[A-Z]/.test(password)) return "Debe tener al menos una mayúscula";
    if (!/[0-9]/.test(password)) return "Debe tener al menos un número";
    if (!/[!@#$%&*()_\-+=\[\]{};:'",.<>?/\\|`~]/.test(password)) return "Debe tener al menos un carácter especial";
    return "";
  }

  // Valida descripción (sin múltiples espacios)
  static validateDescription(description: string, maxLength: number = 150, minLength: number = 1): string {
    const normalized = this.normalizeSpaces(description);
    if (!normalized) return "La descripción es requerida";
    if (normalized.length < minLength) return `La descripción debe tener al menos ${minLength} caracteres`;
    if (normalized.length > maxLength) return `La descripción no puede exceder ${maxLength} caracteres`;
    return "";
  }

  // Normaliza descripción (quita espacios múltiples)
  static normalizeDescription(description: string): string {
    return this.normalizeSpaces(description);
  }

  // Normaliza descripción 
  static normalizeDescriptionSentenceCase(description: string): string {
    const normalized = this.normalizeDescription(description);
    if (!normalized) return "";

    const lower = normalized.toLocaleLowerCase('es');
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
  }

  // Utilidad para saber si el objeto de errores está vacío
  static isValid(errors: Record<string, string>): boolean {
    return Object.values(errors).every((e) => e === "");
  }
}
