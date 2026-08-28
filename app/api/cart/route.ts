import { NextResponse } from "next/server";
import { supabase } from "@lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      table_id,
      session_id,
      menu_item_id,
      title,
      image_url,
      selected_protein,
      selected_size,
      quantity,
      price,
    } = body;

    // ✅ Basic validation
    if (!table_id || !title || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Check if item already exists (avoid duplicates)
    const { data: existingItem } = await supabase
      .from("CartItems")
      .select("*")
      .eq("table_id", table_id)
      .eq("session_id", session_id)
      .eq("menu_item_id", menu_item_id)
      .eq("selected_protein", selected_protein)
      .eq("selected_size", selected_size)
      .single();

    if (existingItem) {
      // 🔁 Update quantity
      const { data, error } = await supabase
        .from("CartItems")
        .update({
          quantity: existingItem.quantity + (quantity || 1),
        })
        .eq("id", existingItem.id)
        .select();

      if (error) throw error;

      return NextResponse.json(data);
    }

    // ➕ Insert new item
    const { data, error } = await supabase
      .from("CartItems")
      .insert([
        {
          table_id,
          session_id,
          menu_item_id,
          title,
          image_url,
          selected_protein,
          selected_size,
          quantity: quantity || 1,
          price,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}
export async function PATCH(req: Request) {
    try {
      const body = await req.json();
  
      const {
        id,
        quantity,
      } = body;
  
      if (!id || quantity < 1) {
        return NextResponse.json(
          { error: "Invalid payload" },
          { status: 400 }
        );
      }
  
      const { data, error } = await supabase
        .from("CartItems")
        .update({
          quantity,
        })
        .eq("id", id)
        .select()
        .single();
  
      if (error) throw error;
  
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to update cart item" },
        { status: 500 }
      );
    }
  }
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
  
    const table_id = searchParams.get("table_id");
    const session_id = searchParams.get("session_id");
  
    const { data, error } = await supabase
      .from("CartItems")
      .select("*")
      .eq("table_id", table_id)
      .eq("session_id", session_id);
  
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch cart" },
        { status: 500 }
      );
    }
  
    return NextResponse.json(data);
  }
  export async function DELETE(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
  
      const id = searchParams.get("id");
  
      if (!id) {
        return NextResponse.json(
          { error: "Cart item id required" },
          { status: 400 }
        );
      }
  
      const { error } = await supabase
        .from("CartItems")
        .delete()
        .eq("id", id);
  
      if (error) throw error;
  
      return NextResponse.json({
        success: true,
      });
    } catch (error) {
  
      return NextResponse.json(
        { error: "Failed to delete cart item" },
        { status: 500 }
      );
    }
  }