#[no_mangle]
pub extern "C" fn score_batch(
    stats_ptr: *const f32,
    state_count: u32,
    mode: u32,
    w0: f32,
    w1: f32,
    w2: f32,
    w3: f32,
    w4: f32,
    w5: f32,
    out_ptr: *mut f32,
) {
    if stats_ptr.is_null() || out_ptr.is_null() {
        return;
    }
    let n = state_count as usize;
    let stats = unsafe { core::slice::from_raw_parts(stats_ptr, n * 6) };
    let out = unsafe { core::slice::from_raw_parts_mut(out_ptr, n) };
    let ws = [w0, w1, w2, w3, w4, w5];
    for i in 0..n {
        let b = i * 6;
        let s0 = stats[b];
        let s1 = stats[b + 1];
        let s2 = stats[b + 2];
        let s3 = stats[b + 3];
        let s4 = stats[b + 4];
        let s5 = stats[b + 5];
        out[i] = match mode {
            1 => s0 * 3.0 + s3 * 1.2 + s2 + s1 + s4 + s5, // str_first
            2 => s2 * 3.0 + s1 * 1.2 + s0 + s3 + s4 + s5, // agi_first
            3 => {
                let mut m = s0;
                if s1 > m { m = s1; }
                if s2 > m { m = s2; }
                if s3 > m { m = s3; }
                if s4 > m { m = s4; }
                if s5 > m { m = s5; }
                s0 + s1 + s2 + s3 + s4 + s5 - m * 0.05
            }
            4 => s0 * ws[0] + s1 * ws[1] + s2 * ws[2] + s3 * ws[3] + s4 * ws[4] + s5 * ws[5], // custom
            _ => s0 + s1 + s2 + s3 + s4 + s5, // sum
        };
    }
}

#[inline]
fn ge6_scalar(a: &[f32], b: &[f32]) -> bool {
    a[0] >= b[0] && a[1] >= b[1] && a[2] >= b[2] && a[3] >= b[3] && a[4] >= b[4] && a[5] >= b[5]
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
#[inline]
unsafe fn ge6_simd(a: *const f32, b: *const f32) -> bool {
    use core::arch::wasm32::*;
    let av = v128_load(a as *const v128);
    let bv = v128_load(b as *const v128);
    let cmp = f32x4_ge(av, bv);
    if i32x4_extract_lane::<0>(cmp) == 0 { return false; }
    if i32x4_extract_lane::<1>(cmp) == 0 { return false; }
    if i32x4_extract_lane::<2>(cmp) == 0 { return false; }
    if i32x4_extract_lane::<3>(cmp) == 0 { return false; }
    *a.add(4) >= *b.add(4) && *a.add(5) >= *b.add(5)
}

#[no_mangle]
pub extern "C" fn prune_flags(
    batch_ptr: *const f32,      // n * 6
    n: u32,
    cand_ptr: *const f32,       // 6
    out_dom_by_ptr: *mut u8,    // n, batch[i] >= cand
    out_dom_cand_ptr: *mut u8,  // n, cand >= batch[i]
) {
    if batch_ptr.is_null() || cand_ptr.is_null() || out_dom_by_ptr.is_null() || out_dom_cand_ptr.is_null() {
        return;
    }
    let count = n as usize;
    let batch = unsafe { core::slice::from_raw_parts(batch_ptr, count * 6) };
    let cand = unsafe { core::slice::from_raw_parts(cand_ptr, 6) };
    let out_by = unsafe { core::slice::from_raw_parts_mut(out_dom_by_ptr, count) };
    let out_cand = unsafe { core::slice::from_raw_parts_mut(out_dom_cand_ptr, count) };
    for i in 0..count {
        let b = &batch[i * 6..i * 6 + 6];
        #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
        let by = unsafe { ge6_simd(b.as_ptr(), cand.as_ptr()) };
        #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
        let by = ge6_scalar(b, cand);

        #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
        let cand_dom = unsafe { ge6_simd(cand.as_ptr(), b.as_ptr()) };
        #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
        let cand_dom = ge6_scalar(cand, b);

        out_by[i] = if by { 1 } else { 0 };
        out_cand[i] = if cand_dom { 1 } else { 0 };
    }
}

#[no_mangle]
pub extern "C" fn route_prune_flags(
    batch_codes_ptr: *const u16,   // n * code_width
    batch_growth_ptr: *const f32,  // n * 6
    n: u32,
    code_width: u32,
    transfer_count: u32,
    cand_code_ptr: *const u16,     // code_width
    cand_growth_ptr: *const f32,   // 6
    out_dom_by_ptr: *mut u8,       // n: kept dominates candidate (noLater + ge)
    out_dom_cand_ptr: *mut u8,     // n: candidate dominates kept (noLater + ge)
) {
    if batch_codes_ptr.is_null()
        || batch_growth_ptr.is_null()
        || cand_code_ptr.is_null()
        || cand_growth_ptr.is_null()
        || out_dom_by_ptr.is_null()
        || out_dom_cand_ptr.is_null()
    {
        return;
    }
    let count = n as usize;
    let width = code_width as usize;
    let tcnt = transfer_count as usize;
    let batch_codes = unsafe { core::slice::from_raw_parts(batch_codes_ptr, count * width) };
    let batch_growth = unsafe { core::slice::from_raw_parts(batch_growth_ptr, count * 6) };
    let cand_code = unsafe { core::slice::from_raw_parts(cand_code_ptr, width) };
    let cand_growth = unsafe { core::slice::from_raw_parts(cand_growth_ptr, 6) };
    let out_by = unsafe { core::slice::from_raw_parts_mut(out_dom_by_ptr, count) };
    let out_cand = unsafe { core::slice::from_raw_parts_mut(out_dom_cand_ptr, count) };

    for i in 0..count {
        let cb = i * width;
        let gb = i * 6;
        let mut kept_no_later = true; // kept <= cand
        let mut cand_no_later = true; // cand <= kept
        for j in 0..tcnt {
            let kv = batch_codes[cb + j];
            let cv = cand_code[j];
            if kv > cv {
                kept_no_later = false;
            }
            if cv > kv {
                cand_no_later = false;
            }
            if !kept_no_later && !cand_no_later {
                break;
            }
        }
        let kept_g = &batch_growth[gb..gb + 6];

        #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
        let kept_ge_cand = unsafe { ge6_simd(kept_g.as_ptr(), cand_growth.as_ptr()) };
        #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
        let kept_ge_cand = ge6_scalar(kept_g, cand_growth);

        #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
        let cand_ge_kept = unsafe { ge6_simd(cand_growth.as_ptr(), kept_g.as_ptr()) };
        #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
        let cand_ge_kept = ge6_scalar(cand_growth, kept_g);

        out_by[i] = if kept_no_later && kept_ge_cand { 1 } else { 0 };
        out_cand[i] = if cand_no_later && cand_ge_kept { 1 } else { 0 };
    }
}

#[no_mangle]
pub extern "C" fn combo_pass_flags(
    panel_ptr: *const f32,      // 6
    equips_ptr: *const f32,     // equip_n * 6
    equip_n: u32,
    skills_ptr: *const f32,     // skill_n * 6
    skill_n: u32,
    require_ptr: *const f32,    // 6
    out_ptr: *mut u8,           // equip_n * skill_n
) {
    if panel_ptr.is_null() || equips_ptr.is_null() || skills_ptr.is_null() || require_ptr.is_null() || out_ptr.is_null() {
        return;
    }
    let en = equip_n as usize;
    let sn = skill_n as usize;
    let panel = unsafe { core::slice::from_raw_parts(panel_ptr, 6) };
    let equips = unsafe { core::slice::from_raw_parts(equips_ptr, en * 6) };
    let skills = unsafe { core::slice::from_raw_parts(skills_ptr, sn * 6) };
    let req = unsafe { core::slice::from_raw_parts(require_ptr, 6) };
    let out = unsafe { core::slice::from_raw_parts_mut(out_ptr, en * sn) };
    let mut idx = 0usize;
    for ei in 0..en {
        let eb = ei * 6;
        for si in 0..sn {
            let sb = si * 6;
            let p0 = panel[0] + equips[eb] + skills[sb];
            let p1 = panel[1] + equips[eb + 1] + skills[sb + 1];
            let p2 = panel[2] + equips[eb + 2] + skills[sb + 2];
            let p3 = panel[3] + equips[eb + 3] + skills[sb + 3];
            let p4 = panel[4] + equips[eb + 4] + skills[sb + 4];
            let p5 = panel[5] + equips[eb + 5] + skills[sb + 5];
            out[idx] = if p0 >= req[0] && p1 >= req[1] && p2 >= req[2] && p3 >= req[3] && p4 >= req[4] && p5 >= req[5] { 1 } else { 0 };
            idx += 1;
        }
    }
}
