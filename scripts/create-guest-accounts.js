const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

const accounts = [
  { email: "guest01@shuxiangnote.top", password: "EMQ6TEBk" },
  { email: "guest02@shuxiangnote.top", password: "zenah9CY" },
  { email: "guest03@shuxiangnote.top", password: "9rmDPQtQ" },
  { email: "guest04@shuxiangnote.top", password: "PXvFxqbW" },
  { email: "guest05@shuxiangnote.top", password: "cqY7N6W2" },
  { email: "guest06@shuxiangnote.top", password: "jWq9jtfS" },
  { email: "guest07@shuxiangnote.top", password: "9XDa9bCt" },
  { email: "guest08@shuxiangnote.top", password: "34mmZrwv" },
  { email: "guest09@shuxiangnote.top", password: "RND3K9B8" },
  { email: "guest10@shuxiangnote.top", password: "nZSmDn92" },
  { email: "guest11@shuxiangnote.top", password: "i5nxcnyY" },
  { email: "guest12@shuxiangnote.top", password: "avcz6nZ9" },
  { email: "guest13@shuxiangnote.top", password: "8Uf2uxvx" },
  { email: "guest14@shuxiangnote.top", password: "JSmWgwep" },
  { email: "guest15@shuxiangnote.top", password: "zpavycbe" },
]

async function main() {
  for (const acc of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } })
    if (existing) {
      console.log(`[skip] ${acc.email} already exists`)
      continue
    }

    const passwordHash = await bcrypt.hash(acc.password, 10)
    const user = await prisma.user.create({
      data: {
        email: acc.email,
        passwordHash,
        isVerified: true,
        onboardDone: true,
      },
    })

    await prisma.tag.create({
      data: { userId: user.id, name: "随笔", isDefault: true },
    })

    console.log(`[ok] ${acc.email} created (id: ${user.id})`)
  }

  console.log("\nDone! All guest accounts created.")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
