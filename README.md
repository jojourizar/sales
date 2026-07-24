# Deal Motion Router

Skill de Claude Code que audita cómo trabajar cada cuenta de LAYERS según su motion comercial (Estratégico, Mid-Market o SMB), leyendo Pipedrive en solo lectura.

El problema que resuelve: tratar a una small/medium business igual que a una enterprise. No es un error de precio, es un error de motion. Un deal de gobierno y una usina regional pueden cerrar por cifras parecidas y necesitar formas de vender completamente distintas: distinto comité, distinta cadencia, distintos materiales, distinta asignación de recursos.

## Qué necesitas
- Claude Code instalado.
- El MCP de Pipedrive conectado en modo read-only.
- Node.js 18 o superior (el mismo que ya usa el MCP).

No hay dependencias que instalar. La skill no ejecuta `npm install`.

## Instalación (piloto, por zip)
1. Descomprime la carpeta `deal-motion-router` dentro de `~/.claude/skills/`.
2. Reinicia Claude Code.
3. Pide: "audita el deal de <nombre de cuenta>".

## Qué te devuelve
Un audit por cuenta con seis piezas:
1. Veredicto de motion, con las razones que lo justifican.
2. Mapa del comité de compra, con los huecos marcados.
3. Benchmark de cadencia de toques para ese motion.
4. Checklist de materiales a preparar y para quién.
5. Checklist de cobertura del comité.
6. Guía de asignación de recursos.

Antes de todo eso, si el analizador no pudo determinar algo (moneda no soportada, etapa desconocida, organización sin vincular, TIER no reconocido), lo dice primero. El instrumento prefiere admitir lo que no sabe a dar un juicio seguro y equivocado.

## Cómo clasifica
La clasificación se ancla en campos que ya existen en el CRM:
1. Base: el valor de vida del deal en euros contra los umbrales de la rúbrica. Si el deal no tiene importe utilizable (divisa sin cambio, o valor cero), se infiere por hectáreas y facturación, y el audit avisa.
2. Government, banca y aseguradoras suben siempre a Estratégico, con independencia del ticket: son compra por comité.
3. Una organización TIER 0 (Internacional) sube siempre a Estratégico: es una multinacional y se vende por comité. TIER 1, 2 y 3 no mueven el motion, porque ese campo mide alcance geográfico, no complejidad de compra.
4. Las subidas nunca bajan el motion: se queda el más alto de los tres.

## Pruebas de la lógica
Desde la carpeta de la skill: `node --test`. No requiere Pipedrive ni conexión.

## Configuración
- `config/rubric.json`: tipos de cambio, umbrales de valor, subidas por TIER, segmentos estratégicos, techo de hectáreas plausibles. **Este es el archivo que se toca para recalibrar.**
- `config/field-map.json`: las claves de los campos de Pipedrive de esta instancia. Solo cambia si cambia la instancia de Pipedrive.

Los tests de `test/config.test.js` validan que la configuración sea coherente, así que una recalibración con un error se detecta al correr `node --test`.

## Alcance
v1: clasificación y audit por cuenta. El roll-up trimestral de cartera es v1.5.
