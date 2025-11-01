import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Path to your configs.json file
    const filePath = path.join(process.cwd(), 'public', 'configs.json')

    // Write the updated config to the file
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({ success: true, message: 'Config saved successfully' })
  } catch (error) {
    console.error('Error saving config:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save config' },
      { status: 500 }
    )
  }
}
