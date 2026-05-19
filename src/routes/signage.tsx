import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, RefreshCw, Plus, Monitor, ListVideo, Image as ImageIcon, Calendar, Tv, Copy, ExternalLink, Pencil, Link as LinkIcon, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listMedia,
  createMedia,
  deleteMedia,
  listPlaylists,
  createPlaylist,
  listDisplays,
  createDisplay,
  updateDisplay,
  deleteDisplay,
  linkDisplay,
  listDisplayPlaylists,
  assignPlaylistToDisplay,
  unassignPlaylistFromDisplay,
  listSchedules,
} from "@/lib/signage.functions";

export const Route = createFileRoute("/signage")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signage TV — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

type AnyItem = Record<string, unknown>;

const MEDIA_TYPES = ["image", "video", "url", "html", "youtube", "google_drive", "rss"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

function Page() {
  const { isOwner, loading } = useAuth();
  if (loading) return null;
  if (!isOwner) return <p className="text-sm text-muted-foreground">Acesso restrito ao dono.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Signage TV</h1>
        <p className="text-sm text-muted-foreground">
          Conteúdo das TVs da barbearia via Sighor. Configure a chave em Configurações.
        </p>
      </div>

      <Tabs defaultValue="tv" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tv"><Tv className="mr-1 h-4 w-4" /> TV Atendimento</TabsTrigger>
          <TabsTrigger value="media"><ImageIcon className="mr-1 h-4 w-4" /> Mídias</TabsTrigger>
          <TabsTrigger value="playlists"><ListVideo className="mr-1 h-4 w-4" /> Playlists</TabsTrigger>
          <TabsTrigger value="displays"><Monitor className="mr-1 h-4 w-4" /> Displays</TabsTrigger>
          <TabsTrigger value="schedules"><Calendar className="mr-1 h-4 w-4" /> Agendamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="tv"><TvTab /></TabsContent>
        <TabsContent value="media"><MediaTab /></TabsContent>
        <TabsContent value="playlists"><PlaylistsTab /></TabsContent>
        <TabsContent value="displays"><DisplaysTab /></TabsContent>
        <TabsContent value="schedules"><SchedulesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useList(fn: () => Promise<unknown>) {
  const [items, setItems] = useState<AnyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = (await fn()) as unknown;
      const arr = Array.isArray(res)
        ? res
        : res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)
          ? ((res as { data: unknown[] }).data)
          : [];
      setItems(arr as AnyItem[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return { items, loading, err, reload: load };
}

function MediaTab() {
  const list = useServerFn(listMedia);
  const create = useServerFn(createMedia);
  const del = useServerFn(deleteMedia);
  const { items, loading, err, reload } = useList(() => list({}));

  const [name, setName] = useState("");
  const [type, setType] = useState<MediaType>("image");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name || !url) return toast.error("Preencha nome e URL");
    setSaving(true);
    try {
      await create({ data: { name, type, url, description: description || undefined } });
      toast.success("Mídia criada");
      setName(""); setUrl(""); setDescription("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta mídia?")) return;
    try {
      await del({ data: { id } });
      toast.success("Excluída");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Mídias</CardTitle>
          <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
            : err ? <p className="text-sm text-destructive">{err}</p>
            : items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma mídia ainda.</p>
            : (
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((m) => (
                  <div key={String(m.id)} className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{String(m.name ?? "—")}</p>
                        <Badge variant="secondary" className="text-[10px]">{String(m.type ?? "")}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{String(m.url ?? "")}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(String(m.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nova mídia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Banner promo" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as MediaType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDIA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PlaylistsTab() {
  const list = useServerFn(listPlaylists);
  const create = useServerFn(createPlaylist);
  const { items, loading, err, reload } = useList(() => list({}));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name) return toast.error("Informe um nome");
    setSaving(true);
    try {
      await create({ data: { name, description: description || undefined } });
      toast.success("Playlist criada");
      setName(""); setDescription("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Playlists</CardTitle>
          <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
            : err ? <p className="text-sm text-destructive">{err}</p>
            : items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma playlist.</p>
            : (
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={String(p.id)} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium">{String(p.name ?? "—")}</p>
                    {p.description ? (
                      <p className="text-xs text-muted-foreground">{String(p.description)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nova playlist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Criar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const RESOLUTIONS = ["1920x1080", "1080x1920", "1280x720", "720x1280", "3840x2160"];
const WEEKDAYS = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

function DisplaysTab() {
  const list = useServerFn(listDisplays);
  const listP = useServerFn(listPlaylists);
  const create = useServerFn(createDisplay);
  const del = useServerFn(deleteDisplay);
  const { items, loading, err, reload } = useList(() => list({}));
  const playlists = useList(() => listP({}));

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [resolution, setResolution] = useState<string>("1920x1080");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name) return toast.error("Informe um nome");
    setSaving(true);
    try {
      await create({
        data: {
          name,
          location: location || undefined,
          description: description || undefined,
          resolution: resolution || undefined,
          orientation,
        },
      });
      toast.success("Display criado");
      setName(""); setLocation(""); setDescription("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este display?")) return;
    try {
      await del({ data: { id } });
      toast.success("Excluído");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Displays</CardTitle>
          <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
            : err ? <p className="text-sm text-destructive">{err}</p>
            : items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum display registrado.</p>
            : (
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((d) => (
                  <DisplayCard
                    key={String(d.id)}
                    display={d}
                    playlists={playlists.items}
                    onChanged={reload}
                    onRemove={() => remove(String(d.id))}
                  />
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo display</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="TV Recepção" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Local</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Entrada" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Resolução</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Orientação</Label>
              <Select value={orientation} onValueChange={(v) => setOrientation(v as "landscape" | "portrait")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Paisagem</SelectItem>
                  <SelectItem value="portrait">Retrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Criar display"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Após criar, use <strong>Vincular TV</strong> com o código de 6 dígitos exibido em{" "}
            <span className="font-mono">sighor.lovable.app/player</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DisplayCard({
  display,
  playlists,
  onChanged,
  onRemove,
}: {
  display: AnyItem;
  playlists: AnyItem[];
  onChanged: () => void;
  onRemove: () => void;
}) {
  const update = useServerFn(updateDisplay);
  const link = useServerFn(linkDisplay);
  const listAssign = useServerFn(listDisplayPlaylists);
  const assign = useServerFn(assignPlaylistToDisplay);
  const unassign = useServerFn(unassignPlaylistFromDisplay);

  const id = String(display.id);
  const status = String(display.status ?? "offline");

  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [plOpen, setPlOpen] = useState(false);

  const [name, setName] = useState(String(display.name ?? ""));
  const [location, setLocation] = useState(String(display.location ?? ""));
  const [description, setDescription] = useState(String(display.description ?? ""));
  const [resolution, setResolution] = useState(String(display.resolution ?? "1920x1080"));
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    (display.orientation as "landscape" | "portrait") ?? "landscape",
  );
  const [pairing, setPairing] = useState("");

  const [assignments, setAssignments] = useState<AnyItem[]>([]);
  const [pid, setPid] = useState("");
  const [priority, setPriority] = useState(0);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  async function loadAssignments() {
    try {
      const res = (await listAssign({ data: { id } })) as unknown;
      const arr = Array.isArray(res)
        ? res
        : res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)
          ? ((res as { data: unknown[] }).data)
          : [];
      setAssignments(arr as AnyItem[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function save() {
    try {
      await update({ data: { id, name, location, description, resolution, orientation } });
      toast.success("Atualizado");
      setEditOpen(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function doLink() {
    if (!/^[0-9]{6}$/.test(pairing)) return toast.error("Código de 6 dígitos");
    try {
      await link({ data: { id, pairing_code: pairing } });
      toast.success("TV vinculada");
      setPairing(""); setLinkOpen(false); onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function doAssign() {
    if (!pid) return toast.error("Escolha uma playlist");
    try {
      await assign({ data: { id, playlist_id: pid, priority, weekdays: days } });
      toast.success("Playlist atribuída");
      setPid(""); setPriority(0); setDays([0, 1, 2, 3, 4, 5, 6]);
      loadAssignments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function doUnassign(aid: string) {
    try {
      await unassign({ data: { id, assignment_id: aid } });
      loadAssignments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{String(display.name ?? "—")}</p>
            <Badge variant={status === "online" ? "default" : "secondary"} className="text-[10px]">{status}</Badge>
          </div>
          {display.location ? <p className="truncate text-xs text-muted-foreground">{String(display.location)}</p> : null}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {String(display.resolution ?? "—")} · {String(display.orientation ?? "—")}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} title="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Pencil className="mr-1 h-3 w-3" /> Editar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar display</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Local</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Resolução</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Orientação</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as "landscape" | "portrait")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Paisagem</SelectItem>
                      <SelectItem value="portrait">Retrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><LinkIcon className="mr-1 h-3 w-3" /> Vincular TV</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Vincular TV</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Abra <span className="font-mono">sighor.lovable.app/player</span> na TV e informe o código de 6 dígitos exibido.
              </p>
              <Input
                value={pairing}
                onChange={(e) => setPairing(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center font-mono text-xl tracking-widest"
                inputMode="numeric"
              />
            </div>
            <DialogFooter>
              <Button onClick={doLink} disabled={pairing.length !== 6}>Vincular</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={plOpen}
          onOpenChange={(o) => { setPlOpen(o); if (o) loadAssignments(); }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Settings className="mr-1 h-3 w-3" /> Playlists</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Playlists do display</DialogTitle></DialogHeader>

            <div className="space-y-2">
              {assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma playlist atribuída.</p>
              ) : assignments.map((a) => {
                const pl = (a.playlist as { name?: string } | undefined)?.name;
                return (
                  <div key={String(a.id)} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{String(pl ?? a.playlist_id ?? "—")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Prioridade {String(a.priority ?? 0)} · {(a.weekdays as number[] | undefined)?.map((w) => WEEKDAYS[w]?.l).join(", ") || "todos os dias"}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => doUnassign(String(a.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-md border border-dashed border-border p-3">
              <p className="text-xs font-medium">Atribuir nova playlist</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Playlist</Label>
                <Select value={pid} onValueChange={setPid}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {playlists.map((p) => (
                      <SelectItem key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade (0 = maior)</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w) => {
                    const checked = days.includes(w.v);
                    return (
                      <label key={w.v} className="flex items-center gap-1 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            setDays((prev) =>
                              c ? Array.from(new Set([...prev, w.v])).sort() : prev.filter((x) => x !== w.v),
                            );
                          }}
                        />
                        {w.l}
                      </label>
                    );
                  })}
                </div>
              </div>
              <Button size="sm" onClick={doAssign} className="w-full">
                <Plus className="mr-1 h-3 w-3" /> Atribuir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function SchedulesTab() {
  const list = useServerFn(listSchedules);
  const { items, loading, err, reload } = useList(() => list({}));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Agendamentos</CardTitle>
        <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
          : err ? <p className="text-sm text-destructive">{err}</p>
          : items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>
          : (
            <ul className="space-y-2">
              {items.map((s) => (
                <li key={String(s.id)} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{String(s.name ?? s.title ?? "Agendamento")}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(s.start_at ?? s.start_date ?? "")} → {String(s.end_at ?? s.end_date ?? "")}
                  </p>
                </li>
              ))}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}

function extractYouTubeId(input: string): { kind: "playlist" | "video"; id: string } | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    const list = url.searchParams.get("list");
    if (list) return { kind: "playlist", id: list };
    const v = url.searchParams.get("v");
    if (v) return { kind: "video", id: v };
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\//, "");
      if (id) return { kind: "video", id };
    }
  } catch {
    if (/^PL[A-Za-z0-9_-]{10,}$/.test(s)) return { kind: "playlist", id: s };
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { kind: "video", id: s };
  }
  return null;
}

function TvTab() {
  const [raw, setRaw] = useState("");
  const parsed = extractYouTubeId(raw);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const tvUrl = parsed
    ? `${origin}/signage/tv?${parsed.kind}=${encodeURIComponent(parsed.id)}`
    : `${origin}/signage/tv`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(tvUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não consegui copiar");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            <iframe key={tvUrl} src={tvUrl} title="TV" className="h-full w-full" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Mostra: <strong>vídeo/playlist do YouTube</strong> no centro, atendimento atual à
            esquerda e os próximos 3 agendamentos à direita. Atualiza automaticamente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurar TV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">URL ou ID do YouTube</Label>
            <Input
              placeholder="https://youtube.com/playlist?list=... ou ID"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Aceita link da playlist, link do vídeo, link curto youtu.be ou só o ID.
            </p>
          </div>
          {parsed ? (
            <Badge variant="secondary" className="text-[10px]">
              {parsed.kind === "playlist" ? "Playlist" : "Vídeo"}: {parsed.id}
            </Badge>
          ) : raw ? (
            <p className="text-xs text-destructive">Não consegui reconhecer este link.</p>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs">Link da TV</Label>
            <div className="flex gap-2">
              <Input readOnly value={tvUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to="/signage/tv" search={parsed ? { [parsed.kind]: parsed.id } as never : ({} as never)} target="_blank">
                <ExternalLink className="mr-1 h-4 w-4" /> Abrir em nova aba
              </Link>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Dica: abra esta URL no navegador da TV em tela cheia (F11).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
