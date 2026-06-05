"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const WORKFLOW_DIR = '.agent-workflow';
const ARCHIVE_DIR = 'archive';
const ACTIVE_DOCUMENTS = [
    { filename: 'task.md', label: 'Tasks', description: 'Current executable tasks', icon: 'checklist' },
    { filename: 'request.md', label: 'Request', description: 'Requirements and assumptions', icon: 'symbol-property' },
    { filename: 'plan.md', label: 'Plan', description: 'Approved implementation plan', icon: 'list-ordered' },
    { filename: 'speedwagon.md', label: 'External Findings', description: 'Decision-relevant findings', icon: 'references' },
    { filename: 'index.md', label: 'Archive Index', description: 'Archived workflow lookup', icon: 'book' }
];
const ARCHIVE_DOCUMENT_ORDER = [
    'summary.md',
    'task.md',
    'request.md',
    'plan.md',
    'speedwagon.md',
    'index.md'
];
const OVERVIEW_SCHEME = 'replta-workflow';
const OVERVIEW_URI = vscode.Uri.parse(`${OVERVIEW_SCHEME}:/active-overview.md`);
function activate(context) {
    const activeProvider = new ActiveWorkflowProvider();
    const archiveProvider = new ArchiveWorkflowProvider();
    const overviewProvider = new WorkflowOverviewProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('repltaWorkflow.active', activeProvider), vscode.window.registerTreeDataProvider('repltaWorkflow.archives', archiveProvider), vscode.workspace.registerTextDocumentContentProvider(OVERVIEW_SCHEME, overviewProvider), vscode.commands.registerCommand('repltaWorkflow.refresh', () => {
        activeProvider.refresh();
        archiveProvider.refresh();
        overviewProvider.refresh();
    }), vscode.commands.registerCommand('repltaWorkflow.openOverview', async () => {
        await vscode.commands.executeCommand('markdown.showPreviewToSide', OVERVIEW_URI);
    }), vscode.commands.registerCommand('repltaWorkflow.openMarkdownPreview', async (node) => {
        const uri = node instanceof WorkflowNode ? node.fileUri : undefined;
        if (!uri) {
            await vscode.window.showWarningMessage('Select a workflow Markdown file to preview.');
            return;
        }
        await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
    }));
    const root = getWorkspaceRoot();
    if (root) {
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, `${WORKFLOW_DIR}/**/*.md`));
        const refresh = () => {
            activeProvider.refresh();
            archiveProvider.refresh();
            overviewProvider.refresh();
        };
        context.subscriptions.push(watcher, watcher.onDidChange(refresh), watcher.onDidCreate(refresh), watcher.onDidDelete(refresh));
    }
}
function deactivate() {
    // Nothing to dispose manually. VSCode owns registered disposables through subscriptions.
}
class WorkflowNode extends vscode.TreeItem {
    constructor(options) {
        super(options.label, options.collapsibleState ?? vscode.TreeItemCollapsibleState.None);
        this.kind = options.kind;
        this.fileUri = options.fileUri;
        this.archiveUri = options.archiveUri;
        this.description = options.description;
        this.tooltip = options.tooltip;
        if (options.icon) {
            this.iconPath = new vscode.ThemeIcon(options.icon);
        }
        if (options.fileUri) {
            this.resourceUri = options.fileUri;
            this.contextValue = 'workflowFile';
            this.command = {
                command: 'repltaWorkflow.openMarkdownPreview',
                title: 'Open Markdown Preview',
                arguments: [this]
            };
        }
        if (options.kind === 'overview') {
            this.contextValue = 'workflowOverview';
            this.command = {
                command: 'repltaWorkflow.openOverview',
                title: 'Open Workflow Overview'
            };
        }
    }
}
class ActiveWorkflowProvider {
    constructor() {
        this.changedEmitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.changedEmitter.event;
    }
    refresh() {
        this.changedEmitter.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        const root = getWorkspaceRoot();
        if (!root) {
            return [emptyNode('Open a workspace folder to view workflow documents.')];
        }
        const workflowUri = vscode.Uri.joinPath(root.uri, WORKFLOW_DIR);
        if (!(await exists(workflowUri))) {
            return [emptyNode('No .agent-workflow folder found.')];
        }
        const nodes = [new WorkflowNode({
                label: 'Workflow Overview',
                kind: 'overview',
                description: 'active-overview.md',
                tooltip: 'Preview active workflow documents together',
                icon: 'preview'
            })];
        for (const document of ACTIVE_DOCUMENTS) {
            const uri = vscode.Uri.joinPath(workflowUri, document.filename);
            if (!(await exists(uri))) {
                continue;
            }
            nodes.push(new WorkflowNode({
                label: document.label,
                kind: 'file',
                description: document.filename,
                tooltip: document.description,
                icon: document.icon,
                fileUri: uri
            }));
        }
        return nodes;
    }
}
class WorkflowOverviewProvider {
    constructor() {
        this.changedEmitter = new vscode.EventEmitter();
        this.onDidChange = this.changedEmitter.event;
    }
    refresh() {
        this.changedEmitter.fire(OVERVIEW_URI);
    }
    async provideTextDocumentContent() {
        const root = getWorkspaceRoot();
        if (!root) {
            return '# Workflow Overview\n\nOpen a workspace folder to view workflow documents.\n';
        }
        const workflowUri = vscode.Uri.joinPath(root.uri, WORKFLOW_DIR);
        const lines = [
            '# Workflow Overview',
            '',
            `Workspace: ${root.name}`,
            '',
            '## Contents'
        ];
        for (const document of ACTIVE_DOCUMENTS) {
            lines.push(`- [${document.label}](#${markdownAnchor(document.label)})`);
        }
        lines.push('');
        for (const document of ACTIVE_DOCUMENTS) {
            const uri = vscode.Uri.joinPath(workflowUri, document.filename);
            lines.push(`## ${document.label}`, '', `Source: \`${WORKFLOW_DIR}/${document.filename}\``, '');
            const content = await readMarkdownFile(uri);
            if (content === undefined) {
                lines.push(`_${document.filename} does not exist._`, '');
                continue;
            }
            const trimmed = content.trim();
            lines.push(trimmed.length > 0 ? trimmed : `_${document.filename} is empty._`, '');
        }
        return `${lines.join('\n')}\n`;
    }
}
class ArchiveWorkflowProvider {
    constructor() {
        this.changedEmitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.changedEmitter.event;
    }
    refresh() {
        this.changedEmitter.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        const root = getWorkspaceRoot();
        if (!root) {
            return [emptyNode('Open a workspace folder to view workflow archives.')];
        }
        if (element?.kind === 'archive' && element.archiveUri) {
            return this.getArchiveDocuments(element.archiveUri);
        }
        if (element) {
            return [];
        }
        const archiveRootUri = vscode.Uri.joinPath(root.uri, WORKFLOW_DIR, ARCHIVE_DIR);
        if (!(await exists(archiveRootUri))) {
            return [emptyNode('No workflow archives found.')];
        }
        const entries = await safeReadDirectory(archiveRootUri);
        const archiveFolders = entries
            .filter(([, type]) => (type & vscode.FileType.Directory) !== 0)
            .map(([name]) => name)
            .sort((left, right) => right.localeCompare(left));
        if (archiveFolders.length === 0) {
            return [emptyNode('No workflow archives found.')];
        }
        return archiveFolders.map((folderName) => new WorkflowNode({
            label: folderName,
            kind: 'archive',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            description: 'archive',
            tooltip: `${WORKFLOW_DIR}/${ARCHIVE_DIR}/${folderName}`,
            icon: 'archive',
            archiveUri: vscode.Uri.joinPath(archiveRootUri, folderName)
        }));
    }
    async getArchiveDocuments(archiveUri) {
        const entries = await safeReadDirectory(archiveUri);
        const markdownFiles = entries
            .filter(([name, type]) => (type & vscode.FileType.File) !== 0 && name.endsWith('.md'))
            .map(([name]) => name)
            .sort(compareArchiveDocuments);
        if (markdownFiles.length === 0) {
            return [emptyNode('No Markdown files in this archive.')];
        }
        return markdownFiles.map((filename) => new WorkflowNode({
            label: archiveDocumentLabel(filename),
            kind: 'file',
            description: filename,
            tooltip: filename,
            icon: filename === 'summary.md' ? 'book' : 'markdown',
            fileUri: vscode.Uri.joinPath(archiveUri, filename)
        }));
    }
}
function getWorkspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0];
}
function emptyNode(label) {
    return new WorkflowNode({
        label,
        kind: 'empty',
        icon: 'info'
    });
}
async function exists(uri) {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch {
        return false;
    }
}
async function safeReadDirectory(uri) {
    try {
        return await vscode.workspace.fs.readDirectory(uri);
    }
    catch {
        return [];
    }
}
async function readMarkdownFile(uri) {
    try {
        return new TextDecoder('utf-8').decode(await vscode.workspace.fs.readFile(uri));
    }
    catch {
        return undefined;
    }
}
function markdownAnchor(label) {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-');
}
function compareArchiveDocuments(left, right) {
    const leftIndex = ARCHIVE_DOCUMENT_ORDER.indexOf(left);
    const rightIndex = ARCHIVE_DOCUMENT_ORDER.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) {
            return 1;
        }
        if (rightIndex === -1) {
            return -1;
        }
        return leftIndex - rightIndex;
    }
    return left.localeCompare(right);
}
function archiveDocumentLabel(filename) {
    switch (filename) {
        case 'summary.md':
            return 'Summary';
        case 'task.md':
            return 'Tasks';
        case 'request.md':
            return 'Request';
        case 'plan.md':
            return 'Plan';
        case 'speedwagon.md':
            return 'External Findings';
        case 'index.md':
            return 'Archive Index';
        default:
            return filename;
    }
}
//# sourceMappingURL=extension.js.map