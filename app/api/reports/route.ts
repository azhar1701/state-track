import { NextResponse, type NextRequest } from "next/server";

import { reportSchema } from "@/lib/validation/report";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawPayload = formData.get("payload");

    if (typeof rawPayload !== "string") {
      return NextResponse.json({ message: "Payload tidak ditemukan" }, { status: 400 });
    }

    const parsedPayload = JSON.parse(rawPayload);
    const data = reportSchema.parse(parsedPayload);

    const photos = formData.getAll("photos").filter((file): file is File => file instanceof File);

    // TODO: Simpan data ke basis data atau layanan penyimpanan sesuai kebutuhan aplikasi.
    // Simpan file foto ke storage pilihan Anda di sini.

    return NextResponse.json(
      {
        message: "Laporan berhasil diterima",
        data: {
          ...data,
          photoCount: photos.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/reports]", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat memproses laporan";
    return NextResponse.json({ message }, { status: 400 });
  }
}
