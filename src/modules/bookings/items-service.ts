import { prisma } from '../../lib/prisma'

interface AddBookingItemsInput {
  bookingId: string
  barbershopId: string
  extraIds: string[]
  productIds: string[]
  include: object
}

interface RemoveBookingItemInput {
  bookingId: string
  barbershopId: string
  type: 'extra' | 'product'
  itemId: string
  include: object
}

export async function addBookingItemsToBooking(input: AddBookingItemsInput) {
  const { bookingId, barbershopId, extraIds, productIds, include } = input

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, barbershopId },
    select: {
      id: true,
      endTime: true,
      totalPrice: true,
      totalDuration: true,
    },
  })
  if (!booking) throw new Error('BOOKING_NOT_FOUND')

  const [extras, products] = await Promise.all([
    prisma.extra.findMany({
      where: { id: { in: extraIds }, barbershopId, active: true },
    }),
    prisma.product.findMany({
      where: { id: { in: productIds }, barbershopId, active: true },
    }),
  ])

  if (extras.length !== extraIds.length) throw new Error('EXTRAS_NOT_FOUND')
  if (products.length !== productIds.length) throw new Error('PRODUCTS_NOT_FOUND')

  const unavailableProduct = products.find((product) => product.stock <= 0)
  if (unavailableProduct) throw new Error(`PRODUCT_OUT_OF_STOCK:${unavailableProduct.name}`)

  const addedDuration = extras.reduce((sum, extra) => sum + extra.duration, 0)
  const addedPrice =
    extras.reduce((sum, extra) => sum + Number(extra.price), 0) +
    products.reduce((sum, product) => sum + Number(product.price), 0)

  return prisma.$transaction(async (tx) => {
    if (extras.length > 0) {
      await tx.bookingExtra.createMany({
        data: extras.map((extra) => ({
          bookingId: booking.id,
          extraId: extra.id,
          price: extra.price,
          duration: extra.duration,
        })),
      })
    }

    if (products.length > 0) {
      await tx.bookingProduct.createMany({
        data: products.map((product) => ({
          bookingId: booking.id,
          productId: product.id,
          price: product.price,
        })),
      })

      for (const product of products) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: 1 } },
        })
      }
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: {
        totalPrice: booking.totalPrice + addedPrice,
        totalDuration: booking.totalDuration + addedDuration,
        endTime: new Date(booking.endTime.getTime() + addedDuration * 60 * 1000),
      },
      include,
    })
  })
}

export async function removeBookingItemFromBooking(input: RemoveBookingItemInput) {
  const { bookingId, barbershopId, type, itemId, include } = input

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, barbershopId },
    select: {
      id: true,
      endTime: true,
      totalPrice: true,
      totalDuration: true,
    },
  })
  if (!booking) throw new Error('BOOKING_NOT_FOUND')

  const updated = await prisma.$transaction(async (tx) => {
    if (type === 'extra') {
      const bookingExtra = await tx.bookingExtra.findFirst({
        where: {
          id: itemId,
          bookingId: booking.id,
          booking: { barbershopId },
        },
      })
      if (!bookingExtra) throw new Error('BOOKING_EXTRA_NOT_FOUND')

      await tx.bookingExtra.delete({ where: { id: bookingExtra.id } })

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          totalPrice: booking.totalPrice - bookingExtra.price,
          totalDuration: Math.max(0, booking.totalDuration - bookingExtra.duration),
          endTime: new Date(booking.endTime.getTime() - bookingExtra.duration * 60 * 1000),
        },
        include,
      })
    }

    const bookingProduct = await tx.bookingProduct.findFirst({
      where: {
        id: itemId,
        bookingId: booking.id,
        booking: { barbershopId },
      },
    })
    if (!bookingProduct) throw new Error('BOOKING_PRODUCT_NOT_FOUND')

    await tx.bookingProduct.delete({ where: { id: bookingProduct.id } })
    await tx.product.update({
      where: { id: bookingProduct.productId },
      data: { stock: { increment: 1 } },
    })

    return tx.booking.update({
      where: { id: booking.id },
      data: {
        totalPrice: booking.totalPrice - bookingProduct.price,
      },
      include,
    })
  }).catch((error: unknown) => {
    if (error instanceof Error && (error.message === 'BOOKING_EXTRA_NOT_FOUND' || error.message === 'BOOKING_PRODUCT_NOT_FOUND')) {
      return null
    }

    throw error
  })

  if (!updated) throw new Error('BOOKING_ITEM_NOT_FOUND')
  return updated
}
