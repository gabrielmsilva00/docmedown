/** Authored translations of the built-in reader and developer guides. Code and configuration keys stay literal. */
export const DMD_TRANSLATIONS: Record<string, { navigation: string; developers: string }> = {
  "pt-BR": {
    navigation: `# Navegar na documentação DocMeDown

Use este guia para explorar as páginas, pesquisar e ajustar sua experiência de leitura.

## Busca rápida

Pressione **Ctrl+K** ou **Cmd+K** para abrir a busca. Pesquise títulos, seções e conteúdo. Use ↑ e ↓ para selecionar um resultado, Enter para abri-lo e Esc para fechar.

## Navegação lateral e dispositivos móveis

A barra lateral organiza os documentos por categorias recolhíveis e destaca a página ativa. No celular, abra o menu pelo botão ou deslize da borda esquerda para a direita. Feche tocando no fundo, deslizando para a esquerda ou pressionando Esc.

## Sumário e caminhos de navegação

O sumário à direita acompanha a seção atual. Selecione um título para ir até ele; o destino recebe um destaque temporário. Os caminhos no topo permitem explorar documentos relacionados e categorias superiores.

## Idiomas

Use o seletor na barra superior para trocar o idioma sem sair do documento lógico atual. Quando não houver tradução, o aviso identifica o conteúdo original exibido. O idioma padrão pertence ao projeto, e a sua escolha fica salva neste site.

## Leitura e temas

A barra de progresso acompanha a leitura. O tempo estimado e as etiquetas ajudam a explorar o conteúdo. Use os controles de aparência para alternar entre claro, escuro e preferência do sistema e ajustar o tema.

## Código e tabelas

Copie exemplos pelo botão do bloco de código. O menu das tabelas permite exportar os dados em Markdown, CSV e TSV. A rolagem horizontal mantém tabelas largas utilizáveis em telas menores.

## Atalhos e edição

| Atalho | Ação |
| :--- | :--- |
| Ctrl/Cmd+K | Abrir ou fechar a busca |
| Ctrl/Cmd+E | Abrir o editor Markdown |
| Esc | Fechar o menu, modal ou navegação móvel |
| Tab / Shift+Tab | Mover o foco acessível |

No servidor local, o editor salva na origem ou na prévia. Em cópias offline, as alterações ficam na sessão local e podem ser exportadas. Confira o nome do arquivo: editar uma página em fallback modifica o original.

## Para desenvolvedores

[Criar e configurar seu próprio projeto DocMeDown](DMD/for-developers)
`,
    developers: `# DocMeDown para desenvolvedores

[Voltar ao guia de navegação](DMD)

Transforme arquivos Markdown em documentação pesquisável, páginas estáticas e uma cópia offline.

## Início rápido

Execute \`npx docmedown init ./docs\` para criar um projeto. Selecione os idiomas, escolha o idioma original e confirme a estrutura. Os seis idiomas predefinidos são inglês, português brasileiro, espanhol, francês, alemão e chinês simplificado. Você também pode cadastrar o nome de outro idioma e seu sufixo, como \`ja\`.

Para automação, use \`npx docmedown init ./docs --yes --default-locale en --locales pt-BR,es,fr,de,zh-CN\`. Use \`npx docmedown serve ./docs\` para a prévia com recarregamento automático.

## Arquivos e configuração

Mantenha os documentos em \`docs/\`, as opções em \`docs.json\` e os componentes em \`.dmd/\`. Diretórios representam categorias, não idiomas. \`guide.md\` usa \`i18n.defaultLocale\`; \`guide.pt-br.md\` é sua tradução. \`guide.en.md\` tem precedência sobre o original sem sufixo quando o padrão é inglês. Registre os idiomas em \`i18n.locales\` e execute \`npx docmedown config ./docs\` para alterar as opções.

Configure \`name\`, \`tagline\`, \`version\`, \`theme.family\` e \`theme.accentColor\` para identidade visual. Os temas são Atlas, Blueprint, Terminal, Editorial, Botanical e Studio. \`footer.showBuiltWith\` controla o acesso a este guia. \`url\` habilita URLs canônicas, sitemap e robots. Cada idioma aceita \`overrides\` para navegação, busca e rodapé.

## Comandos

| Comando | Função |
| :--- | :--- |
| \`serve\` | Servidor local, editor e HMR |
| \`build\` | Páginas estáticas, dados, contexto de IA e cópia offline |
| \`init\` | Assistente de criação |
| \`config\` | Configuração interativa |
| \`doctor\` | Diagnóstico do ambiente e componentes |
| \`validate\` | Validação de configuração, links e âncoras |
| \`mcp\` | Servidor de leitura e busca para assistentes de IA |

## Componentes, publicação e offline

Use componentes integrados como \`<Card title="Dica">Conteúdo</Card>\`. Arquivos Svelte, React TSX e Web Components em \`.dmd/\` disponibilizam componentes personalizados. Execute \`npx docmedown build ./docs\` e publique os arquivos servíveis em um host estático, como GitHub Pages. A cópia \`.dist/index.html\` pode ser aberta sem servidor e inclui os idiomas escolhidos.

## Documentação para IA e fallback

O build gera \`llms.txt\`, \`llms-full.txt\`, \`SKILL.md\` e \`okf.json\`, além de variantes de contexto por idioma. Execute \`npx docmedown mcp ./docs\` para integrar assistentes. Estes guias DMD têm seis traduções nativas; idiomas adicionais usam inglês quando não houver tradução. Isso não traduz automaticamente os documentos do seu projeto.
`,
  },
  es: {
    navigation: `# Navegar por la documentación DocMeDown

Explore páginas, busque información y ajuste la lectura con las herramientas integradas.

## Búsqueda rápida

Pulse **Ctrl+K** o **Cmd+K** para buscar títulos, secciones y contenido. Use ↑ y ↓ para elegir un resultado, Enter para abrirlo y Esc para cerrar.

## Barra lateral y móviles

La barra lateral agrupa documentos en categorías plegables y resalta la página actual. En el móvil, toque el menú o deslice hacia la derecha desde el borde izquierdo. Para cerrar, toque el fondo, deslice hacia la izquierda o pulse Esc.

## Índice y rutas de navegación

El índice de la derecha sigue la sección visible. Seleccione un título para desplazarse hasta él; el destino se resalta brevemente. Las rutas superiores permiten explorar páginas relacionadas y categorías superiores.

## Idiomas

El selector superior cambia el idioma conservando el documento lógico. Si falta una traducción, un aviso identifica el original mostrado. El proyecto define el idioma original y su elección queda guardada para este sitio.

## Lectura y apariencia

La barra de progreso muestra el avance. El tiempo estimado y las etiquetas ayudan a explorar el contenido. Los controles de apariencia permiten elegir modo claro, oscuro o del sistema y cambiar el tema.

## Código y tablas

Copie ejemplos con el botón de cada bloque de código. Exporte tablas como Markdown, CSV o TSV mediante su menú. Las tablas anchas permiten desplazamiento horizontal.

## Atajos y edición

| Atajo | Acción |
| :--- | :--- |
| Ctrl/Cmd+K | Abrir o cerrar la búsqueda |
| Ctrl/Cmd+E | Abrir el editor Markdown |
| Esc | Cerrar menú, diálogo o navegación móvil |
| Tab / Shift+Tab | Mover el foco accesible |

En el servidor local, guarde en el archivo original o en la vista previa. En copias sin conexión, los cambios se conservan localmente y se pueden exportar. Compruebe el nombre del archivo: editar una página de respaldo modifica el original.

## Para desarrolladores

[Crear y configurar un proyecto DocMeDown](DMD/for-developers)
`,
    developers: `# DocMeDown para desarrolladores

[Volver a la guía de navegación](DMD)

Convierta Markdown en documentación con búsqueda, páginas estáticas y una copia sin conexión.

## Inicio rápido

Ejecute \`npx docmedown init ./docs\`. Seleccione los idiomas, el idioma original y confirme la estructura. Hay seis opciones: inglés, portugués brasileño, español, francés, alemán y chino simplificado. También puede introducir el nombre de otro idioma y su sufijo, como \`ja\`.

Para automatizar: \`npx docmedown init ./docs --yes --default-locale en --locales pt-BR,es,fr,de,zh-CN\`. Use \`npx docmedown serve ./docs\` para abrir la vista previa con recarga automática.

## Archivos y configuración

Los documentos están en \`docs/\`, las opciones en \`docs.json\` y los componentes en \`.dmd/\`. Las carpetas representan categorías, no idiomas. \`guide.md\` usa \`i18n.defaultLocale\`; \`guide.es.md\` es su traducción. Con inglés como original, \`guide.en.md\` tiene prioridad sobre el archivo sin sufijo. Registre los idiomas en \`i18n.locales\`. Use \`npx docmedown config ./docs\` para ajustar las opciones.

Configure \`name\`, \`tagline\`, \`version\`, \`theme.family\` y \`theme.accentColor\` para personalizar la identidad. Elija Atlas, Blueprint, Terminal, Editorial, Botanical o Studio. \`footer.showBuiltWith\` controla el enlace a esta guía y \`url\` habilita URLs canónicas, sitemap y robots. Cada idioma admite \`overrides\` de navegación, búsqueda y pie de página.

## Comandos

| Comando | Función |
| :--- | :--- |
| \`serve\` | Servidor local, editor y HMR |
| \`build\` | Sitio estático, datos, contexto de IA y copia sin conexión |
| \`init\` | Asistente de creación |
| \`config\` | Configuración interactiva |
| \`doctor\` | Diagnóstico del entorno y los componentes |
| \`validate\` | Validación de configuración, enlaces y anclas |
| \`mcp\` | Lectura y búsqueda para asistentes de IA |

## Componentes y publicación

Utilice componentes integrados como \`<Card title="Consejo">Contenido</Card>\`. Los archivos Svelte, React TSX y Web Components en \`.dmd/\` añaden componentes personalizados. Ejecute \`npx docmedown build ./docs\` y publique los archivos en un host estático como GitHub Pages. La copia \`.dist/index.html\` funciona sin servidor e incluye los idiomas seleccionados.

## IA y respaldo

El build genera \`llms.txt\`, \`llms-full.txt\`, \`SKILL.md\`, \`okf.json\` y variantes de contexto por idioma. Ejecute \`npx docmedown mcp ./docs\` para integrar asistentes. Las guías DMD incluyen seis idiomas y usan inglés si no existe traducción para un idioma adicional. Los documentos del proyecto no se traducen automáticamente.
`,
  },
  fr: {
    navigation: `# Parcourir la documentation DocMeDown

Explorez les pages, recherchez des informations et adaptez votre lecture.

## Recherche rapide

Appuyez sur **Ctrl+K** ou **Cmd+K** pour rechercher dans les titres, les sections et le contenu. Utilisez ↑ et ↓ pour choisir un résultat, Entrée pour l’ouvrir et Échap pour fermer.

## Navigation latérale et mobile

La barre latérale organise les documents en catégories repliables et indique la page active. Sur mobile, touchez le menu ou balayez vers la droite depuis le bord gauche. Fermez en touchant l’arrière-plan, en balayant vers la gauche ou avec Échap.

## Sommaire et fil d’Ariane

Le sommaire à droite suit la section visible. Sélectionnez un titre pour le rejoindre ; la cible est brièvement mise en évidence. Le fil d’Ariane permet d’accéder aux pages voisines et aux catégories parentes.

## Langues

Le sélecteur de la barre supérieure change la langue sans quitter le document logique. Si la traduction manque, un avis indique la langue du contenu original. Le projet définit la langue d’origine et votre choix est mémorisé pour ce site.

## Lecture et apparence

La barre de progression suit votre lecture. Le temps estimé et les étiquettes facilitent l’exploration. Les réglages d’apparence proposent les modes clair, sombre et système ainsi que plusieurs thèmes.

## Code et tableaux

Copiez les exemples avec le bouton du bloc de code. Le menu des tableaux permet une exportation en Markdown, CSV ou TSV. Les tableaux larges défilent horizontalement.

## Raccourcis et édition

| Raccourci | Action |
| :--- | :--- |
| Ctrl/Cmd+K | Ouvrir ou fermer la recherche |
| Ctrl/Cmd+E | Ouvrir l’éditeur Markdown |
| Échap | Fermer le menu, la fenêtre ou le panneau mobile |
| Tab / Maj+Tab | Déplacer le focus accessible |

Sur le serveur local, enregistrez dans la source ou dans l’aperçu. Hors connexion, les modifications restent locales et peuvent être exportées. Vérifiez le nom du fichier : modifier une page affichée par repli modifie l’original.

## Pour les développeurs

[Créer et configurer votre projet DocMeDown](DMD/for-developers)
`,
    developers: `# DocMeDown pour les développeurs

[Revenir au guide de navigation](DMD)

Transformez Markdown en documentation consultable, pages statiques et copie hors connexion.

## Démarrage rapide

Exécutez \`npx docmedown init ./docs\`. Sélectionnez les langues, choisissez la langue d’origine et confirmez la structure. Six langues sont proposées : anglais, portugais brésilien, espagnol, français, allemand et chinois simplifié. Vous pouvez aussi saisir le nom d’une autre langue et son suffixe, comme \`ja\`.

Pour automatiser : \`npx docmedown init ./docs --yes --default-locale en --locales pt-BR,es,fr,de,zh-CN\`. Lancez \`npx docmedown serve ./docs\` pour l’aperçu avec rechargement automatique.

## Fichiers et configuration

Placez les documents dans \`docs/\`, les options dans \`docs.json\` et les composants dans \`.dmd/\`. Les dossiers représentent des catégories, pas des langues. \`guide.md\` utilise \`i18n.defaultLocale\` ; \`guide.fr.md\` est sa traduction. Avec l’anglais comme original, \`guide.en.md\` est prioritaire sur le fichier sans suffixe. Déclarez les langues dans \`i18n.locales\`. Utilisez \`npx docmedown config ./docs\` pour modifier les réglages.

Personnalisez \`name\`, \`tagline\`, \`version\`, \`theme.family\` et \`theme.accentColor\`. Les thèmes sont Atlas, Blueprint, Terminal, Editorial, Botanical et Studio. \`footer.showBuiltWith\` contrôle le lien vers ce guide. \`url\` active les URL canoniques, le sitemap et robots. Chaque langue accepte des \`overrides\` pour la navigation, la recherche et le pied de page.

## Commandes

| Commande | Fonction |
| :--- | :--- |
| \`serve\` | Serveur local, éditeur et HMR |
| \`build\` | Pages statiques, données, contexte IA et copie hors connexion |
| \`init\` | Assistant de création |
| \`config\` | Configuration interactive |
| \`doctor\` | Diagnostic de l’environnement et des composants |
| \`validate\` | Validation de la configuration, des liens et des ancres |
| \`mcp\` | Lecture et recherche pour les assistants IA |

## Composants et publication

Utilisez les composants intégrés, par exemple \`<Card title="Conseil">Contenu</Card>\`. Les fichiers Svelte, React TSX et Web Components dans \`.dmd/\` ajoutent vos composants. Exécutez \`npx docmedown build ./docs\` puis publiez les fichiers sur un hébergeur statique comme GitHub Pages. La copie \`.dist/index.html\` fonctionne sans serveur et inclut les langues sélectionnées.

## IA et repli

Le build génère \`llms.txt\`, \`llms-full.txt\`, \`SKILL.md\`, \`okf.json\` et des variantes de contexte par langue. Lancez \`npx docmedown mcp ./docs\` pour les assistants. Les guides DMD incluent six langues et utilisent l’anglais lorsqu’une langue supplémentaire n’est pas traduite. Les documents du projet ne sont pas traduits automatiquement.
`,
  },
  de: {
    navigation: `# In der DocMeDown-Dokumentation navigieren

Erkunden Sie Seiten, suchen Sie Informationen und passen Sie die Leseansicht an.

## Schnellsuche

Öffnen Sie die Suche mit **Strg+K** oder **Cmd+K**. Durchsucht werden Titel, Abschnitte und Inhalte. Wählen Sie mit ↑ und ↓ ein Ergebnis, öffnen Sie es mit Eingabe und schließen Sie die Suche mit Esc.

## Seitenleiste und Mobilgeräte

Die Seitenleiste ordnet Dokumente in aufklappbare Kategorien und markiert die aktuelle Seite. Öffnen Sie das mobile Menü über die Schaltfläche oder wischen Sie vom linken Rand nach rechts. Zum Schließen tippen Sie auf den Hintergrund, wischen nach links oder drücken Esc.

## Inhaltsverzeichnis und Brotkrümelnavigation

Das rechte Inhaltsverzeichnis folgt dem sichtbaren Abschnitt. Ein Klick auf eine Überschrift führt dorthin und hebt das Ziel kurz hervor. Über den Pfad am Seitenanfang erreichen Sie benachbarte Dokumente und übergeordnete Kategorien.

## Sprachen

Die Sprachauswahl oben wechselt die Sprache desselben logischen Dokuments. Fehlt eine Übersetzung, kennzeichnet ein Hinweis das angezeigte Original. Das Projekt legt die Originalsprache fest; Ihre Auswahl wird für diese Website gespeichert.

## Lesen und Darstellung

Der Fortschrittsbalken zeigt den Lesestand. Geschätzte Lesezeit und Schlagwörter helfen beim Erkunden. Die Darstellung bietet helle, dunkle und systemabhängige Modi sowie verschiedene Designs.

## Code und Tabellen

Kopieren Sie Beispiele mit der Schaltfläche am Codeblock. Das Tabellenmenü exportiert Markdown, CSV und TSV. Breite Tabellen lassen sich horizontal scrollen.

## Tastenkürzel und Bearbeitung

| Tastenkürzel | Aktion |
| :--- | :--- |
| Strg/Cmd+K | Suche öffnen oder schließen |
| Strg/Cmd+E | Markdown-Editor öffnen |
| Esc | Menü, Dialog oder mobile Navigation schließen |
| Tab / Umschalt+Tab | Tastaturfokus bewegen |

Auf dem lokalen Server speichern Sie in der Quelle oder Vorschau. Offline bleiben Änderungen lokal und können exportiert werden. Prüfen Sie den Dateinamen: Wird das Original als Ersatz angezeigt, bearbeiten Sie diese Originaldatei.

## Für Entwickler

[Ein eigenes DocMeDown-Projekt erstellen und konfigurieren](DMD/for-developers)
`,
    developers: `# DocMeDown für Entwickler

[Zurück zur Navigationshilfe](DMD)

Erstellen Sie aus Markdown eine durchsuchbare Dokumentation, statische Seiten und eine Offlinekopie.

## Schnellstart

Führen Sie \`npx docmedown init ./docs\` aus. Wählen Sie die Projektsprachen und die Originalsprache, und bestätigen Sie die Struktur. Sechs Vorgaben stehen bereit: Englisch, brasilianisches Portugiesisch, Spanisch, Französisch, Deutsch und vereinfachtes Chinesisch. Weitere Sprachen werden mit Name und Suffix, etwa \`ja\`, hinzugefügt.

Für Automatisierung: \`npx docmedown init ./docs --yes --default-locale en --locales pt-BR,es,fr,de,zh-CN\`. \`npx docmedown serve ./docs\` startet die Vorschau mit automatischer Aktualisierung.

## Dateien und Konfiguration

Dokumente liegen in \`docs/\`, Einstellungen in \`docs.json\` und Komponenten in \`.dmd/\`. Ordner sind Kategorien, keine Sprachen. \`guide.md\` verwendet \`i18n.defaultLocale\`; \`guide.de.md\` ist die Übersetzung. Bei Englisch als Original hat \`guide.en.md\` Vorrang vor der Datei ohne Suffix. Registrieren Sie Sprachen in \`i18n.locales\`. \`npx docmedown config ./docs\` öffnet die Einstellungen.

Passen Sie \`name\`, \`tagline\`, \`version\`, \`theme.family\` und \`theme.accentColor\` an. Verfügbar sind Atlas, Blueprint, Terminal, Editorial, Botanical und Studio. \`footer.showBuiltWith\` steuert den Link zu dieser Hilfe. \`url\` aktiviert kanonische URLs, Sitemap und robots. Sprachbezogene \`overrides\` passen Navigation, Suche und Fußzeile an.

## Befehle

| Befehl | Funktion |
| :--- | :--- |
| \`serve\` | Lokaler Server, Editor und HMR |
| \`build\` | Statische Seiten, Daten, KI-Kontext und Offlinekopie |
| \`init\` | Einrichtungsassistent |
| \`config\` | Interaktive Konfiguration |
| \`doctor\` | Diagnose von Umgebung und Komponenten |
| \`validate\` | Einstellungen, Links und Anker prüfen |
| \`mcp\` | Lesen und Suchen für KI-Assistenten |

## Komponenten und Veröffentlichung

Verwenden Sie integrierte Komponenten wie \`<Card title="Tipp">Inhalt</Card>\`. Svelte-, React-TSX- und Web-Component-Dateien in \`.dmd/\` ergänzen eigene Komponenten. Erstellen Sie mit \`npx docmedown build ./docs\` die Ausgabe und veröffentlichen Sie diese auf einem statischen Host wie GitHub Pages. \`.dist/index.html\` funktioniert ohne Server und enthält die ausgewählten Sprachen.

## KI und Ersatzsprache

Der Build erzeugt \`llms.txt\`, \`llms-full.txt\`, \`SKILL.md\`, \`okf.json\` und sprachbezogene Kontextdateien. \`npx docmedown mcp ./docs\` verbindet Assistenten. Die DMD-Hilfe bietet sechs Sprachen; für weitere Sprachen ohne Übersetzung wird Englisch verwendet. Projektdokumente werden nicht automatisch übersetzt.
`,
  },
  "zh-CN": {
    navigation: `# 浏览 DocMeDown 文档

使用内置工具浏览页面、搜索信息并调整阅读体验。

## 快速搜索

按 **Ctrl+K** 或 **Cmd+K** 搜索页面标题、章节和正文。使用 ↑ 和 ↓ 选择结果，按 Enter 打开，按 Esc 关闭。

## 侧边栏与移动设备

侧边栏按可折叠分类组织文档，并突出显示当前页面。在手机上，点击菜单按钮或从左边缘向右滑动即可打开。点击背景、向左滑动或按 Esc 即可关闭。

## 目录与面包屑导航

右侧目录会跟随当前阅读的章节。点击标题可跳转到相应位置，目标会短暂高亮。页面顶部的路径可帮助您访问同级文档和上级分类。

## 语言选择

顶部语言选择器会切换同一逻辑文档的语言。如果没有对应译文，提示会说明当前显示的是哪种语言的原文。原始语言由项目配置决定，您的选择会保存在此站点中。

## 阅读与外观

进度条显示阅读进度，预计阅读时间和标签帮助您发现相关内容。外观设置提供浅色、深色和跟随系统模式，以及多种主题。

## 代码与表格

使用代码块上的复制按钮复制示例。表格菜单可导出 Markdown、CSV 或 TSV。较宽的表格支持水平滚动。

## 快捷键与编辑

| 快捷键 | 操作 |
| :--- | :--- |
| Ctrl/Cmd+K | 打开或关闭搜索 |
| Ctrl/Cmd+E | 打开 Markdown 编辑器 |
| Esc | 关闭菜单、对话框或移动侧边栏 |
| Tab / Shift+Tab | 移动键盘焦点 |

在本地服务器中，可保存到源文件或预览区。在离线副本中，修改保存在本地并可导出。请检查文件名：编辑回退显示的页面会修改原始文件。

## 开发者指南

[创建并配置自己的 DocMeDown 项目](DMD/for-developers)
`,
    developers: `# DocMeDown 开发者指南

[返回导航指南](DMD)

将 Markdown 转换为支持搜索的文档、静态页面和离线副本。

## 快速开始

运行 \`npx docmedown init ./docs\`。选择项目语言和原始语言，然后确认目录结构。内置六种语言：英语、巴西葡萄牙语、西班牙语、法语、德语和简体中文。也可以输入其他语言的名称及后缀，例如 \`ja\`。

自动化示例：\`npx docmedown init ./docs --yes --default-locale en --locales pt-BR,es,fr,de,zh-CN\`。运行 \`npx docmedown serve ./docs\` 可启动自动刷新的本地预览。

## 文件与配置

文档放在 \`docs/\`，配置放在 \`docs.json\`，组件放在 \`.dmd/\`。目录表示分类，而不是语言。\`guide.md\` 使用 \`i18n.defaultLocale\`，\`guide.zh-cn.md\` 是对应译文。当英语为原始语言时，\`guide.en.md\` 优先于无语言后缀的文件。在 \`i18n.locales\` 中注册语言，使用 \`npx docmedown config ./docs\` 修改配置。

使用 \`name\`、\`tagline\`、\`version\`、\`theme.family\` 和 \`theme.accentColor\` 设置品牌与外观。可选主题为 Atlas、Blueprint、Terminal、Editorial、Botanical 和 Studio。\`footer.showBuiltWith\` 控制本指南的入口。\`url\` 启用规范链接、站点地图和 robots。各语言的 \`overrides\` 可覆盖导航、搜索及页脚。

## 命令

| 命令 | 功能 |
| :--- | :--- |
| \`serve\` | 本地服务器、编辑器和 HMR |
| \`build\` | 静态页面、数据、AI 上下文和离线副本 |
| \`init\` | 项目初始化向导 |
| \`config\` | 交互式配置 |
| \`doctor\` | 环境和组件诊断 |
| \`validate\` | 检查配置、链接和锚点 |
| \`mcp\` | 为 AI 助手提供读取与搜索 |

## 组件与发布

可直接使用内置组件，例如 \`<Card title="提示">内容</Card>\`。在 \`.dmd/\` 中添加 Svelte、React TSX 或 Web Components 文件以使用自定义组件。执行 \`npx docmedown build ./docs\`，然后将可托管文件发布到 GitHub Pages 等静态平台。\`.dist/index.html\` 无需服务器即可打开，并包含已选择的语言。

## AI 与语言回退

构建会生成 \`llms.txt\`、\`llms-full.txt\`、\`SKILL.md\`、\`okf.json\` 以及按语言划分的上下文文件。运行 \`npx docmedown mcp ./docs\` 可连接 AI 助手。DMD 指南内置六种语言；其他语言缺少译文时回退到英语。此功能不会自动翻译您的项目文档。
`,
  },
};
