import { z } from 'zod'
import { useState } from 'react'
import { productsApi } from '@/lib/api'
import { CrudPage } from '@/components/admin/CrudPage'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ImagePlus, Package, Trash2 } from 'lucide-react'
import type { Product } from '@/lib/types'

const imageSchema = z.string().refine(
  (value) => value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'),
  'Imagem inválida',
)

const schema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  imageUrl:    imageSchema.optional().or(z.literal('')),
  price:       z.coerce.number().positive(),
  stock:       z.coerce.number().int().min(0),
})
type FormData = z.infer<typeof schema>

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem'))
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File) {
  const source = await readFileAsDataUrl(file)

  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const maxSize = 700
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Nao foi possivel preparar a imagem'))
        return
      }

      ctx.drawImage(image, 0, 0, width, height)
      const result = canvas.toDataURL('image/jpeg', 0.72)

      if (result.length > 1_500_000) {
        reject(new Error('A imagem continua demasiado grande. Tente uma imagem mais pequena.'))
        return
      }

      resolve(result)
    }
    image.onerror = () => reject(new Error('Nao foi possivel processar a imagem'))
    image.src = source
  })
}

export default function Products() {
  const [fileError, setFileError] = useState<string | null>(null)

  return (
    <CrudPage<FormData, Product>
      title="Produtos"
      queryKey="products"
      api={productsApi as unknown as { list: () => Promise<Product[]>; create: (d: FormData) => Promise<Product>; update: (id: string, d: FormData) => Promise<Product>; remove: (id: string) => Promise<unknown> }}
      schema={schema}
      defaultValues={{ name: '', imageUrl: '', price: 0, stock: 0 }}
      getId={(p) => p.id}
      getDefaults={(p) => ({ name: p.name, description: p.description, imageUrl: p.imageUrl ?? '', price: p.price, stock: p.stock })}
      columns={[
        {
          key: 'name',
          label: 'Produto',
          render: (p) => (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Package size={18} className="text-zinc-400" />
                )}
              </div>
              <span className="font-medium">{p.name}</span>
            </div>
          ),
        },
        { key: 'price', label: 'Preço', render: (p) => formatCurrency(p.price) },
        {
          key: 'stock', label: 'Estoque',
          render: (p) => (
            <span className={p.stock === 0 ? 'text-red-500' : p.stock <= 5 ? 'text-orange-500' : ''}>
              {p.stock} un.
            </span>
          ),
        },
      ]}
      formFields={(register, errors, form) => {
        const imageUrl = form.watch('imageUrl')

        const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]
          if (!file) return

          try {
            setFileError(null)
            const dataUrl = await compressImage(file)
            form.setValue('imageUrl', dataUrl as FormData['imageUrl'], { shouldDirty: true, shouldValidate: true })
          } catch (error) {
            setFileError(error instanceof Error ? error.message : 'Nao foi possivel carregar a imagem')
          }
          event.target.value = ''
        }

        return (
        <>
          <Input label="Nome" placeholder="Pomada modeladora" error={errors.name?.message} {...register('name')} />
          <Input label="Descrição" placeholder="Descrição..." {...register('description')} />
          <input type="hidden" {...register('imageUrl')} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Imagem do produto</p>
            <div className="flex items-start gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt="Pré-visualização do produto" className="h-full w-full object-cover" />
                ) : (
                  <Package size={26} className="text-zinc-400" />
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <ImagePlus size={16} />
                  Escolher do computador
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setFileError(null)
                      form.setValue('imageUrl', '' as FormData['imageUrl'], { shouldDirty: true, shouldValidate: true })
                    }}
                  >
                    <Trash2 size={14} />
                    Remover imagem
                  </Button>
                )}
                <p className="text-xs text-zinc-400">Selecione uma imagem do seu computador para o produto.</p>
                {errors.imageUrl?.message && <p className="text-xs text-red-500">{errors.imageUrl.message}</p>}
                {fileError && <p className="text-xs text-red-500">{fileError}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Preço (€)" type="number" step="0.01" placeholder="14.90" error={errors.price?.message} {...register('price')} />
            <Input label="Estoque" type="number" placeholder="0" {...register('stock')} />
          </div>
        </>
        )
      }}
    />
  )
}
