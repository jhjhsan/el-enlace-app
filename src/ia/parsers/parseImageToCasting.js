import * as FileSystem from 'expo-file-system';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

const norm = (s = '') => String(s || '').trim();
const uniq = (arr = []) =>
  Array.from(new Set(arr.map((x) => JSON.stringify(x)))).map((s) => JSON.parse(s));

const pickFirstNonEmpty = (collected, getter) => {
  for (const it of collected) {
    const v = getter(it.data);
    if (v != null) {
      const val = typeof v === 'string' ? v.trim() : v;
      if ((typeof val === 'string' && val) || (typeof val !== 'string')) return v;
    }
  }
  return '';
};

const mergeDates = (collected) => {
  const fields = ['callback', 'wardrobe_shoot', 'release'];
  const out = {};
  fields.forEach((f) => {
    out[f] = pickFirstNonEmpty(collected, (d) => d?.dates?.[f] || '');
  });
  return out;
};

const mergeBudgets = (collected) => {
  const all = collected.flatMap((it) =>
    Array.isArray(it.data?.budgets) ? it.data.budgets : []
  );
  const byRole = {};
  for (const b of all) {
    const key = (b.role || '').toLowerCase();
    if (!key) continue;
    if (!byRole[key]) {
      byRole[key] = {
        role: b.role || '',
        day: '',
        buyout_moving: '',
        buyout_print: '',
        exclusivity_12m: '',
      };
    }
    ['day', 'buyout_moving', 'buyout_print', 'exclusivity_12m'].forEach((f) => {
      const current = Number(String(byRole[key][f] || '').replace(/[^\d]/g, '') || 0);
      const incoming = Number(String(b[f] || '').replace(/[^\d]/g, '') || 0);
      if (incoming > current) byRole[key][f] = String(incoming);
    });
  }
  return Object.values(byRole);
};

const mergeRoles = (collected, fallbackRoles = []) => {
  const all = collected.flatMap((it) =>
    Array.isArray(it.data?.roles) ? it.data.roles : []
  ).concat(Array.isArray(fallbackRoles) ? fallbackRoles : []);
  const keyOf = (r) =>
    [
      (r.roleTitle || '').toLowerCase().replace(/\s+/g, ' ').trim(),
      r.minAge ?? '',
      r.maxAge ?? '',
      (r.gender || '').toLowerCase(),
    ].join('|');
  const map = new Map();
  for (const r of all) {
    const k = keyOf(r);
    if (!map.has(k)) {
      map.set(k, {
        roleTitle: r.roleTitle || '',
        minAge: r.minAge ?? null,
        maxAge: r.maxAge ?? null,
        gender: r.gender ?? null,
        description: r.description || '',
      });
    }
  }
  return Array.from(map.values());
};

const mergeSelfTape = (collected) => {
  const fields = ['presentation', 'photo', 'acting', 'format'];
  const res = {};
  for (const f of fields) {
    res[f] = pickFirstNonEmpty(collected, (d) => d?.self_tape?.[f] || '');
  }
  return res;
};

export async function parseImageToCasting(imageUris = []) {
  try {
    const functions = getFunctions(getApp());
    const analyzeImage = httpsCallable(functions, 'analyzeCastingImage');

    const roles = [];
    let allDescriptions = ''; // 🧠 Texto OCR completo acumulado
    let allRemunerationLines = []; // 💰 Líneas de pago
    let generalData = null;

    const collected = []; // [{ data, idx }]

    for (let i = 0; i < imageUris.length; i++) {
      const uri = imageUris[i];

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await analyzeImage({ imageBase64: base64 });

      if (!response.data?.success) {
        console.warn(
          `⚠️ Imagen ${i + 1} no se pudo analizar:`,
          response.data?.error || 'Error desconocido'
        );
        allDescriptions += `🖼 Imagen ${i + 1}:\n⚠️ No se pudo extraer texto.\n\n`;
        continue;
      }

      const parsed = response.data.result || {};
      collected.push({ data: parsed, idx: i });

      // 🧠 OCR: combinar todos los campos posibles
      const ocrParts = [];
      if (parsed.fullTextAnnotation) ocrParts.push(parsed.fullTextAnnotation);
      if (parsed.rawText) ocrParts.push(parsed.rawText);
      if (parsed.description) ocrParts.push(parsed.description);
      if (Array.isArray(parsed.textBlocks)) {
        parsed.textBlocks.forEach((b) => {
          if (b && b.text) ocrParts.push(b.text);
        });
      }

      // 🧹 Limpiar duplicados y texto basura
      const textoOCR = [...new Set(ocrParts)]
        .map((t) => t.trim())
        .filter((t) => t.length > 3)
        .join('\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

      if (textoOCR) {
        allDescriptions += `🖼 Imagen ${i + 1}:\n${textoOCR}\n\n`;

        const lines = textoOCR.split('\n').map((line) => line.trim());

        // 📌 Detectar secciones por viñetas (solo para contexto humano en la descripción)
        const vinetas = textoOCR.match(/VIÑETA\s+[A-ZÁÉÍÓÚÑ ]+/g);
        if (vinetas) {
          allDescriptions += `📌 SECCIONES DETECTADAS:\n${vinetas.join('\n')}\n\n`;
        }

        // 🎬 Extraer instrucciones (contexto)
        const actingLines = lines.filter((l) =>
          /ACTING|PRESENTACI[ÓO]N|GRABARSE|MOSTRAR|IMPROVISAR/i.test(l)
        );
        if (actingLines.length > 0) {
          allDescriptions += `🎬 INSTRUCCIONES:\n${actingLines.join('\n')}\n\n`;
        }

        // 💰 Buscar sección de remuneración
        let collectingPay = false;
        for (const line of lines) {
          const lower = line.toLowerCase();
          const hasKeyword = /(remuneraci[oó]n|presupuesto|honorarios|buyout|día de trab|dia de trab|pago|exclusividad)/i.test(
            lower
          );
          const hasNumber = /\d/.test(line) || /\$|\.|,/.test(line);

          if (!collectingPay && hasKeyword && hasNumber) {
            collectingPay = true;
            allRemunerationLines.push(line);
            continue;
          }

          if (collectingPay) {
            if (/^\*{2,}/.test(line) || line.trim() === '') break;
            allRemunerationLines.push(line);
          }
        }

        // 🎭 Detectar roles OCR (respaldo)
        const roleRegex =
          /(\d+\s*HOMBRES?|\d+\s*MUJERES?).*?(AÑOS|AFRO|HISPANO|CAUC[ÁA]SICOS|ETNIA|ROLES|PROTA|AMIGOS)/gi;
        const matches = textoOCR.match(roleRegex);
        if (matches && matches.length > 0) {
          matches.forEach((m) => {
            roles.push({ roleTitle: 'Detectado OCR', description: m });
          });
        }
      } else {
        allDescriptions += `🖼 Imagen ${i + 1}:\n⚠️ Texto no reconocido.\n\n`;
      }

      // ✅ Agregar roles del backend
      if (Array.isArray(parsed.roles)) {
        parsed.roles.forEach((role, idx) => {
          const title = role.roleTitle || `Rol ${idx + 1}`;
          const desc = role.description || '';
          allDescriptions += `🎭 ${title}:\n${desc}\n\n`;
        });
        roles.push(...parsed.roles);
      } else if (parsed.role) {
        roles.push(parsed.role);
      }

      if (!generalData) {
        generalData = {
          title: parsed.title || '',
          description: '', // se llena después
          category: parsed.category || '',
          agencyName: parsed.producer || parsed.agencyName || '',
          deadline: parsed.deadline || '',
          modality: parsed.modality || '',
          location: parsed.location || '',
          payment: '', // se llena después
        };
      }
    }

    // Si no hay datos, evitar cortar el flujo
    if (!generalData) {
      console.warn('⚠️ No se pudo analizar ninguna imagen. Se devuelve estructura vacía.');
      generalData = {
        title: '',
        description: '⚠️ No se pudo extraer información del casting.',
        category: '',
        agencyName: '',
        deadline: '',
        modality: '',
        location: '',
        payment: '',
      };
    }

    // 🔗 FUSIÓN desde IA (si hubo al menos un parsed)
    let merged = null;
    if (collected.length > 0) {
      merged = {
        title: pickFirstNonEmpty(collected, (d) => d?.title || ''),
        producer: pickFirstNonEmpty(collected, (d) => d?.producer || d?.agencyName || ''),
        dates: mergeDates(collected),
        exclusivity: pickFirstNonEmpty(collected, (d) => d?.exclusivity || ''),
        rights: pickFirstNonEmpty(collected, (d) => d?.rights || ''),
        budgets: mergeBudgets(collected),
        roles: mergeRoles(collected, roles),
        self_tape: mergeSelfTape(collected),
        restrictions: uniq(
          collected
            .flatMap((it) =>
              Array.isArray(it.data?.restrictions) ? it.data.restrictions : []
            )
            .filter(Boolean)
        ),
        location: pickFirstNonEmpty(collected, (d) => d?.location || ''),
        modality: pickFirstNonEmpty(collected, (d) => d?.modality || ''),
        deadline: pickFirstNonEmpty(collected, (d) => d?.deadline || ''),
      };
    }

    // 📝 Descripción larga y bloque de pago textual (respaldo)
    generalData.description = (allDescriptions || '').trim();
    generalData.payment = (allRemunerationLines.join('\n').trim());

    // Actualiza legacy con fusionado
    if (merged) {
      generalData = {
        title: merged.title || generalData.title,
        description: generalData.description,
        category: generalData.category || '',
        agencyName: merged.producer || generalData.agencyName || '',
        deadline: merged.deadline || generalData.deadline || '',
        modality: merged.modality || generalData.modality || '',
        location: merged.location || generalData.location || '',
        payment: generalData.payment || '',
        __structured: merged,
      };
    }

    // ✅ Return final enriquecido
    return {
      ...generalData,
      roles: generalData.__structured?.roles?.length
        ? generalData.__structured.roles
        : roles,
      budgets: generalData.__structured?.budgets || [],
      dates: generalData.__structured?.dates || {},
      exclusivity: generalData.__structured?.exclusivity || '',
      rights: generalData.__structured?.rights || '',
      self_tape: generalData.__structured?.self_tape || {},
      restrictions: generalData.__structured?.restrictions || [],
    };
  } catch (error) {
    console.error('❌ Error al analizar imágenes:', error);
    return {
      title: '',
      description: '⚠️ Error al procesar el casting.',
      category: '',
      agencyName: '',
      deadline: '',
      modality: '',
      location: '',
      payment: '',
      roles: [],
      budgets: [],
      dates: {},
      exclusivity: '',
      rights: '',
      self_tape: {},
      restrictions: [],
    };
  }
}
