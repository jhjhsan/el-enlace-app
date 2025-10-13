/**
 * Reemplaza <Ionicons name="arrow-back|chevron-back" .../> (y su TouchableOpacity padre si existe)
 * por <BackButton /> y agrega el import si falta.
 *
 * Afecta solo archivos que tengan esas flechas. No toca nada más.
 */
module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Si ya usa <BackButton />, no tocamos el archivo
  if (root.find(j.JSXIdentifier, { name: 'BackButton' }).size() > 0) {
    return null;
  }

  // Encuentra <Ionicons name="arrow-back" | "chevron-back">
  const isBackIcon = (el) => {
    const attrs = el.openingElement.attributes || [];
    const nameAttr = attrs.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'name');
    if (!nameAttr) return false;

    if (nameAttr.value && nameAttr.value.type === 'Literal') {
      return nameAttr.value.value === 'arrow-back' || nameAttr.value.value === 'chevron-back';
    }
    if (nameAttr.value && nameAttr.value.type === 'JSXExpressionContainer' && nameAttr.value.expression.type === 'Literal') {
      return nameAttr.value.expression.value === 'arrow-back' || nameAttr.value.expression.value === 'chevron-back';
    }
    return false;
  };

  const ioniconsEls = root.find(j.JSXElement, {
    openingElement: { name: { type: 'JSXIdentifier', name: 'Ionicons' } }
  }).filter(p => isBackIcon(p.value));

  if (ioniconsEls.size() === 0) {
    return null;
  }

  // Reemplazo por <BackButton />
  const backButtonJSX = j.jsxElement(
    j.jsxOpeningElement(j.jsxIdentifier('BackButton'), [], true),
    null,
    [],
    true
  );

  ioniconsEls.forEach(path => {
    // Si el padre es <TouchableOpacity> lo reemplazamos entero por <BackButton />
    let target = path.parentPath;
    while (
      target &&
      target.value &&
      target.value.type === 'JSXElement' &&
      target.value.openingElement &&
      target.value.openingElement.name &&
      target.value.openingElement.name.type === 'JSXIdentifier' &&
      target.value.openingElement.name.name !== 'TouchableOpacity'
    ) {
      target = target.parentPath;
    }

    if (
      target &&
      target.value &&
      target.value.type === 'JSXElement' &&
      target.value.openingElement &&
      target.value.openingElement.name &&
      target.value.openingElement.name.type === 'JSXIdentifier' &&
      target.value.openingElement.name.name === 'TouchableOpacity'
    ) {
      j(target).replaceWith(backButtonJSX);
    } else {
      // si no hay TouchableOpacity padre, reemplazamos solo el <Ionicons/>
      j(path).replaceWith(backButtonJSX);
    }
  });

  // Añade import BackButton si no existe (asumiendo rutas típicas de /screens/*)
  const hasImport =
    root.find(j.ImportDeclaration, { source: { value: '../components/BackButton' } }).size() > 0 ||
    root.find(j.ImportDeclaration, { source: { value: '../../components/BackButton' } }).size() > 0;

  if (!hasImport) {
    // intenta ../components/BackButton primero
    const importDecl = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('BackButton'))],
      j.literal('../components/BackButton')
    );

    const body = root.get().node.program.body;
    // Inserta el import al inicio después de 'use strict' si existiera
    const firstRealIndex = body[0] && body[0].type === 'ExpressionStatement' && body[0].expression &&
      body[0].expression.type === 'Literal' && body[0].expression.value === 'use strict' ? 1 : 0;

    body.splice(firstRealIndex, 0, importDecl);
  }

  return root.toSource({ quote: 'single' });
};
