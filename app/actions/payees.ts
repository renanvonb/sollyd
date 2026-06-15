'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createEntitySchema = z.object({
    name: z.string().min(1, "O nome é obrigatório"),
})

export async function createPayer(name: string) {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Usuário não autenticado" }
    }

    try {
        const validated = createEntitySchema.parse({ name })

        const { data, error } = await supabase
            .from('payers')
            .insert([{ name: validated.name, user_id: user.id }])
            .select()
            .single()

        if (error) throw error

        // Revalidate transactions page as it might reload options if they are fetched there (though they are fetched in the form)
        // Ideally we return the created item so the client can add it to the state.
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating payer:', error)
        return { success: false, error: error.message }
    }
}

export async function createPayee(name: string) {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: "Usuário não autenticado" }
    }

    try {
        const validated = createEntitySchema.parse({ name })

        const { data, error } = await supabase
            .from('payees')
            .insert([{ name: validated.name, user_id: user.id }])
            .select()
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating payee:', error)
        return { success: false, error: error.message }
    }
}
