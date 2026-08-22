import Image from "next/image";
import { HelpCircle, MoreHorizontal, Save, Search } from "lucide-react";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
  Label,
  LoadingState,
  Modal,
  Radio,
  Select,
  Skeleton,
  StatCard,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
  Tooltip
} from "@/components/design-system";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import icon from "../../../../assets/branding/icone.png.jpg";
import logo from "../../../../assets/branding/logo.png.jpg";
import reference from "../../../../assets/branding/referencia-visual.png.jpg";

const colors = [
  { name: "Azul escuro", value: "#0B1C2A", className: "bg-[#0B1C2A]" },
  { name: "Azul petróleo", value: "#115E6D", className: "bg-[#115E6D]" },
  { name: "Azul/Tiffany", value: "#16A7B9", className: "bg-[#16A7B9]" },
  { name: "Branco", value: "#FFFFFF", className: "bg-white" },
  { name: "Ciano destaque", value: "#00FFFF", className: "bg-[#00FFFF]" }
];

const rows = [
  { name: "Componente", status: "Ativo", owner: "Design System" },
  { name: "Estado visual", status: "Sucesso", owner: "Interface" },
  { name: "Validação", status: "Pendente", owner: "Produto" }
];

function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--border)] py-10 last:border-b-0">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-normal text-[var(--foreground)]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Topbar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
            <div className="mb-8 flex flex-col gap-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src={logo}
                  alt="Logo oficial do Rotula Fácil Pro"
                  className="size-20 rounded-[var(--radius-lg)] object-cover"
                  priority
                />
                <div>
                  <Breadcrumb items={["Rotula Fácil Pro", "Sprint 1", "Design System"]} />
                  <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--foreground)]">
                    Base visual da área interna
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    Página técnica temporária para validar tokens, componentes e estados visuais.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Image
                  src={icon}
                  alt="Ícone oficial do Rotula Fácil Pro"
                  className="size-12 rounded-[var(--radius-md)] object-cover"
                />
                <Badge variant="cyan">Referências oficiais</Badge>
              </div>
            </div>

            <Section
              title="Referência Visual"
              description="Arquivos oficiais usados como base, sem substituição de logo, ícone ou paleta."
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                <Card className="shadow-none">
                  <CardHeader>
                    <div>
                      <CardTitle>Marca</CardTitle>
                      <CardDescription>Logo e ícone oficiais preservados.</CardDescription>
                    </div>
                  </CardHeader>
                  <div className="flex items-center gap-5">
                    <Image
                      src={logo}
                      alt="Logo oficial"
                      className="size-24 rounded-[var(--radius-lg)] object-cover"
                    />
                    <Image
                      src={icon}
                      alt="Ícone oficial"
                      className="size-24 rounded-[var(--radius-lg)] object-cover"
                    />
                  </div>
                </Card>
                <Card className="shadow-none">
                  <Image
                    src={reference}
                    alt="Referência visual oficial do Rotula Fácil Pro"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] object-cover"
                  />
                </Card>
              </div>
            </Section>

            <Section
              title="Paleta"
              description="A interface interna usa base clara, com topbar azul-escuro e tiffany para ações."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {colors.map((color) => (
                  <Card key={color.value} className="p-4 shadow-none">
                    <div
                      className={`mb-4 h-16 rounded-[var(--radius-md)] border border-[var(--border)] ${color.className}`}
                    />
                    <p className="text-sm font-semibold">{color.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{color.value}</p>
                  </Card>
                ))}
              </div>
            </Section>

            <Section
              title="Tipografia"
              description="Fonte sem serifa moderna, com hierarquia clara e leitura confortável."
            >
              <Card className="shadow-none">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-petrol)]">
                  Label
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal">
                  Título moderadamente forte
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                  Texto de apoio discreto, com contraste confortável, pensado para sistemas internos
                  que exigem leitura recorrente e organização visual.
                </p>
              </Card>
            </Section>

            <Section title="Botões e Estados">
              <div className="flex flex-wrap gap-3">
                <Button>
                  <Save className="size-4" /> Primário
                </Button>
                <Button variant="secondary">Secundário</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="success">Sucesso</Button>
                <Button variant="danger">Erro</Button>
                <Button disabled>Desabilitado</Button>
              </div>
            </Section>

            <Section title="Formulários">
              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="space-y-4 shadow-none">
                  <div>
                    <Label>Input padrão</Label>
                    <Input placeholder="Digite uma informação" />
                  </div>
                  <div>
                    <Label>Input com erro</Label>
                    <Input fieldState="error" defaultValue="Valor inválido" />
                  </div>
                  <div>
                    <Label>Input com sucesso</Label>
                    <Input fieldState="success" defaultValue="Valor validado" />
                  </div>
                </Card>
                <Card className="space-y-4 shadow-none">
                  <div>
                    <Label>Textarea</Label>
                    <Textarea placeholder="Observação técnica" />
                  </div>
                  <div>
                    <Label>Select</Label>
                    <Select defaultValue="padrao">
                      <option value="padrao">Padrão</option>
                      <option value="secundario">Secundário</option>
                    </Select>
                  </div>
                </Card>
                <Card className="space-y-4 shadow-none">
                  <Checkbox label="Checkbox default" defaultChecked />
                  <Checkbox label="Checkbox disabled" disabled />
                  <Radio label="Radio default" name="radio-demo" defaultChecked />
                  <Radio label="Radio disabled" name="radio-demo" disabled />
                  <Switch label="Switch ativo" defaultChecked />
                  <Switch label="Switch desabilitado" disabled />
                </Card>
              </div>
            </Section>

            <Section title="Badges, Cards e Indicadores">
              <div className="mb-5 flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="cyan">Cyan</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-4">
                <StatCard label="Base visual" value="100%" helper="Tokens definidos" />
                <StatCard label="Componentes" value="21" helper="Reutilizáveis" />
                <StatCard label="Tema" value="Claro" helper="Área interna" />
                <Card className="shadow-none">
                  <CardTitle>Card padrão</CardTitle>
                  <CardDescription>Container branco, borda discreta e sombra suave.</CardDescription>
                </Card>
              </div>
            </Section>

            <Section title="Tabela">
              <Table>
                <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Responsável</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.name}
                      className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.status === "Sucesso" ? "success" : "secondary"}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.owner}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" className="h-8 px-2" aria-label="Mais ações">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Section>

            <Section title="Modal, Toast, Dropdown, Tabs e Tooltip">
              <div className="grid gap-5 lg:grid-cols-2">
                <Modal title="Modal técnico">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    Estrutura visual para confirmações futuras, sem lógica de negócio nesta sprint.
                  </p>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline">Cancelar</Button>
                    <Button>Confirmar</Button>
                  </div>
                </Modal>
                <Card className="space-y-5 shadow-none">
                  <Toast>
                    <p className="font-semibold text-[var(--foreground)]">Toast informativo</p>
                    <p className="text-[var(--muted)]">Feedback visual discreto para ações futuras.</p>
                  </Toast>
                  <div className="flex flex-wrap items-center gap-3">
                    <Dropdown label="Dropdown">
                      <DropdownItem>Editar</DropdownItem>
                      <DropdownItem>Duplicar</DropdownItem>
                      <DropdownItem className="text-[var(--error)]">Remover</DropdownItem>
                    </Dropdown>
                    <Tooltip label="Ajuda contextual curta">
                      <Button variant="outline" aria-label="Ajuda">
                        <HelpCircle className="size-4" />
                      </Button>
                    </Tooltip>
                  </div>
                  <Tabs tabs={["Geral", "Estados", "Tokens"]} active="Estados" />
                </Card>
              </div>
            </Section>

            <Section title="Empty State, Skeleton e Loading">
              <div className="grid gap-5 lg:grid-cols-3">
                <EmptyState
                  title="Nenhum item para exibir"
                  description="Estado vazio reutilizável, claro e objetivo para telas futuras."
                  action={
                    <Button variant="outline">
                      <Search className="size-4" /> Buscar
                    </Button>
                  }
                />
                <Card className="space-y-3 shadow-none">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-24 w-full" />
                </Card>
                <Card className="flex items-center justify-center shadow-none">
                  <LoadingState label="Carregando estado visual" />
                </Card>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}

