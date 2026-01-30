#!/usr/bin/env python3
"""
Course Type Classification Helper

Analyzes course information to determine course types across all taxonomy groups.
"""

import json
import sys
from typing import Dict, List, Optional, Tuple


COURSE_TYPE_TAXONOMY = {
    "course_type_groups": [
        {
            "id": "ctg_hole_count",
            "key": "hole_count",
            "label": "Hole Count",
            "description": "Number of holes available at the facility.",
            "sortOrder": 1,
            "types": [
                { "id": "ct_hole_count_3", "groupId": "ctg_hole_count", "key": "3", "label": "3-hole", "description": "Very short loop for practice, beginners, or quick play.", "sortOrder": 1, "isActive": True },
                { "id": "ct_hole_count_6", "groupId": "ctg_hole_count", "key": "6", "label": "6-hole", "description": "Time-saving or space-constrained design.", "sortOrder": 2, "isActive": True },
                { "id": "ct_hole_count_9", "groupId": "ctg_hole_count", "key": "9", "label": "9-hole", "description": "Half-length by hole count; often played twice for 18.", "sortOrder": 3, "isActive": True },
                { "id": "ct_hole_count_12", "groupId": "ctg_hole_count", "key": "12", "label": "12-hole", "description": "Time-saving or space-constrained design.", "sortOrder": 4, "isActive": True },
                { "id": "ct_hole_count_18", "groupId": "ctg_hole_count", "key": "18", "label": "18-hole", "description": "Standard full course with par 3/4/5 mix.", "sortOrder": 5, "isActive": True },
                { "id": "ct_hole_count_27", "groupId": "ctg_hole_count", "key": "27", "label": "27-hole", "description": "Typically three 9-hole nines combined into 18.", "sortOrder": 6, "isActive": True },
                { "id": "ct_hole_count_36", "groupId": "ctg_hole_count", "key": "36", "label": "36-hole", "description": "Multiple full courses on one facility.", "sortOrder": 7, "isActive": True }
            ]
        },
        {
            "id": "ctg_length_class",
            "key": "length_class",
            "label": "Length Class",
            "description": "Overall length and par-based format.",
            "sortOrder": 2,
            "types": [
                { "id": "ct_pitch_and_putt", "groupId": "ctg_length_class", "key": "pitch-and-putt", "label": "Pitch-and-putt", "description": "Ultra-short holes, typically up to ~90m; 2-3 clubs.", "sortOrder": 1, "isActive": True },
                { "id": "ct_par_3", "groupId": "ctg_length_class", "key": "par-3", "label": "Par-3", "description": "All holes are par 3; beginner and skills-focused.", "sortOrder": 2, "isActive": True },
                { "id": "ct_executive", "groupId": "ctg_length_class", "key": "executive", "label": "Executive", "description": "Shorter than regulation; mostly par 3s plus short par 4s.", "sortOrder": 3, "isActive": True },
                { "id": "ct_regulation", "groupId": "ctg_length_class", "key": "regulation", "label": "Regulation", "description": "Standard full-length course.", "sortOrder": 4, "isActive": True }
            ]
        },
        {
            "id": "ctg_access",
            "key": "access",
            "label": "Access",
            "description": "Ownership and public access model.",
            "sortOrder": 3,
            "types": [
                { "id": "ct_municipal", "groupId": "ctg_access", "key": "municipal", "label": "Municipal", "description": "Public course owned/operated by a government entity.", "sortOrder": 1, "isActive": True },
                { "id": "ct_public", "groupId": "ctg_access", "key": "public", "label": "Public", "description": "Open to anyone paying a green fee.", "sortOrder": 2, "isActive": True },
                { "id": "ct_daily_fee", "groupId": "ctg_access", "key": "daily-fee", "label": "Daily-fee", "description": "Public access with private ownership.", "sortOrder": 3, "isActive": True },
                { "id": "ct_semi_private", "groupId": "ctg_access", "key": "semi-private", "label": "Semi-private", "description": "Memberships plus public tee times.", "sortOrder": 4, "isActive": True },
                { "id": "ct_private", "groupId": "ctg_access", "key": "private", "label": "Private", "description": "Access primarily via membership.", "sortOrder": 5, "isActive": True }
            ]
        },
        {
            "id": "ctg_purpose",
            "key": "purpose",
            "label": "Purpose",
            "description": "Primary intent and typical audience.",
            "sortOrder": 4,
            "types": [
                { "id": "ct_championship", "groupId": "ctg_purpose", "key": "championship", "label": "Championship", "description": "Tournament-capable, full-length, challenging layout.", "sortOrder": 1, "isActive": True },
                { "id": "ct_stadium_tournament", "groupId": "ctg_purpose", "key": "stadium-tournament", "label": "Stadium/Tournament", "description": "Built for events with spectator infrastructure.", "sortOrder": 2, "isActive": True },
                { "id": "ct_resort", "groupId": "ctg_purpose", "key": "resort", "label": "Resort", "description": "Guest experience, scenic routing, broad playability.", "sortOrder": 3, "isActive": True },
                { "id": "ct_member", "groupId": "ctg_purpose", "key": "member", "label": "Member", "description": "Tuned for repeat play and member enjoyment.", "sortOrder": 4, "isActive": True },
                { "id": "ct_beginner", "groupId": "ctg_purpose", "key": "beginner", "label": "Beginner-friendly", "description": "Wide fairways, shorter carries, forward tees.", "sortOrder": 5, "isActive": True },
                { "id": "ct_junior", "groupId": "ctg_purpose", "key": "junior", "label": "Junior", "description": "Designed for youth programs and instruction.", "sortOrder": 6, "isActive": True },
                { "id": "ct_academy", "groupId": "ctg_purpose", "key": "academy", "label": "Academy", "description": "Coaching-first facility focused on instruction.", "sortOrder": 7, "isActive": True }
            ]
        },
        {
            "id": "ctg_land_type",
            "key": "land_type",
            "label": "Land Type",
            "description": "Physical setting, ecology, and landform.",
            "sortOrder": 5,
            "types": [
                { "id": "ct_links", "groupId": "ctg_land_type", "key": "links", "label": "Links", "description": "Coastal, sandy terrain with dunes and wind exposure.", "sortOrder": 1, "isActive": True },
                { "id": "ct_links_style", "groupId": "ctg_land_type", "key": "links-style", "label": "Links-style", "description": "Inland course imitating links characteristics.", "sortOrder": 2, "isActive": True },
                { "id": "ct_parkland", "groupId": "ctg_land_type", "key": "parkland", "label": "Parkland", "description": "Inland, tree-lined, lush turf, sheltered conditions.", "sortOrder": 3, "isActive": True },
                { "id": "ct_heathland", "groupId": "ctg_land_type", "key": "heathland", "label": "Heathland", "description": "Sandy soils with heather/gorse and firm surfaces.", "sortOrder": 4, "isActive": True },
                { "id": "ct_moorland", "groupId": "ctg_land_type", "key": "moorland", "label": "Moorland", "description": "Upland, open, windswept with elevation and views.", "sortOrder": 5, "isActive": True },
                { "id": "ct_woodland", "groupId": "ctg_land_type", "key": "woodland", "label": "Woodland", "description": "Dense trees with tight corridors and accuracy focus.", "sortOrder": 6, "isActive": True },
                { "id": "ct_desert", "groupId": "ctg_land_type", "key": "desert", "label": "Desert", "description": "Arid terrain with irrigated corridors and native hazards.", "sortOrder": 7, "isActive": True },
                { "id": "ct_mountain", "groupId": "ctg_land_type", "key": "mountain", "label": "Mountain/Alpine", "description": "Significant elevation change and sloped lies.", "sortOrder": 8, "isActive": True },
                { "id": "ct_coastal_cliff", "groupId": "ctg_land_type", "key": "coastal-cliff", "label": "Coastal cliff", "description": "Ocean-adjacent cliffs/headlands without true linksland.", "sortOrder": 9, "isActive": True },
                { "id": "ct_tropical", "groupId": "ctg_land_type", "key": "tropical", "label": "Tropical/Jungle", "description": "Dense vegetation and heavy rainfall considerations.", "sortOrder": 10, "isActive": True },
                { "id": "ct_wetland", "groupId": "ctg_land_type", "key": "wetland", "label": "Wetland/Marsh", "description": "Routed around water systems and wetlands.", "sortOrder": 11, "isActive": True },
                { "id": "ct_volcanic", "groupId": "ctg_land_type", "key": "volcanic", "label": "Volcanic/Lava-field", "description": "Routed through rock and lava features.", "sortOrder": 12, "isActive": True },
                { "id": "ct_island", "groupId": "ctg_land_type", "key": "island", "label": "Island", "description": "Built on an island or multiple water-separated landmasses.", "sortOrder": 13, "isActive": True },
                { "id": "ct_sandbelt", "groupId": "ctg_land_type", "key": "sandbelt", "label": "Sandbelt", "description": "Sandy soils with firm conditions and distinct bunker style.", "sortOrder": 14, "isActive": True }
            ]
        },
        {
            "id": "ctg_design",
            "key": "design",
            "label": "Design Philosophy",
            "description": "Strategic character and style of play.",
            "sortOrder": 6,
            "types": [
                { "id": "ct_penal", "groupId": "ctg_design", "key": "penal", "label": "Penal", "description": "High punishment for misses and narrow corridors.", "sortOrder": 1, "isActive": True },
                { "id": "ct_strategic", "groupId": "ctg_design", "key": "strategic", "label": "Strategic", "description": "Multiple lines of play with risk-reward choices.", "sortOrder": 2, "isActive": True },
                { "id": "ct_heroic", "groupId": "ctg_design", "key": "heroic", "label": "Heroic", "description": "Dramatic carries with high reward for bold shots.", "sortOrder": 3, "isActive": True },
                { "id": "ct_target", "groupId": "ctg_design", "key": "target", "label": "Target golf", "description": "Isolated landing zones and forced carries.", "sortOrder": 4, "isActive": True },
                { "id": "ct_minimalist", "groupId": "ctg_design", "key": "minimalist", "label": "Minimalist", "description": "Light-touch shaping emphasizing natural contours.", "sortOrder": 5, "isActive": True }
            ]
        },
        {
            "id": "ctg_tech",
            "key": "tech",
            "label": "Technology",
            "description": "Technology-mediated play formats.",
            "sortOrder": 7,
            "types": [
                { "id": "ct_none", "groupId": "ctg_tech", "key": "none", "label": "None", "description": "Traditional play without tech-mediated formats.", "sortOrder": 1, "isActive": True },
                { "id": "ct_augmented_range", "groupId": "ctg_tech", "key": "augmented-range", "label": "Augmented range", "description": "Traditional range upgraded with tracking and games.", "sortOrder": 2, "isActive": True },
                { "id": "ct_simulator", "groupId": "ctg_tech", "key": "simulator", "label": "Simulator", "description": "Indoor simulator facility with real shots into a screen.", "sortOrder": 3, "isActive": True },
                { "id": "ct_screen_golf", "groupId": "ctg_tech", "key": "screen-golf", "label": "Screen golf", "description": "High-volume simulator lounge with standardized bays.", "sortOrder": 4, "isActive": True },
                { "id": "ct_entertainment_range", "groupId": "ctg_tech", "key": "entertainment-range", "label": "Entertainment range", "description": "Topgolf-style venues with targets and hospitality.", "sortOrder": 5, "isActive": True },
                { "id": "ct_vr", "groupId": "ctg_tech", "key": "vr", "label": "VR golf", "description": "Virtual golf without ball striking; controller or motion input.", "sortOrder": 6, "isActive": True }
            ]
        },
        {
            "id": "ctg_alternative",
            "key": "alternative",
            "label": "Alternative Golf",
            "description": "Golf-adjacent or alternative sports.",
            "sortOrder": 8,
            "types": [
                { "id": "ct_miniature", "groupId": "ctg_alternative", "key": "miniature", "label": "Miniature golf", "description": "Putting-only course with obstacles and artificial surfaces.", "sortOrder": 1, "isActive": True },
                { "id": "ct_adventure", "groupId": "ctg_alternative", "key": "adventure", "label": "Adventure golf", "description": "Themed mini-golf with elaborate obstacles.", "sortOrder": 2, "isActive": True },
                { "id": "ct_disc", "groupId": "ctg_alternative", "key": "disc", "label": "Disc golf", "description": "Frisbee-style throwing sport with basket targets.", "sortOrder": 3, "isActive": True },
                { "id": "ct_footgolf", "groupId": "ctg_alternative", "key": "footgolf", "label": "Footgolf", "description": "Soccer-ball golf using oversized cups.", "sortOrder": 4, "isActive": True }
            ]
        }
    ]
}


def classify_hole_count(holes: int) -> str:
    """Classify hole count type based on number of holes."""
    if holes <= 3:
        return "3"
    elif holes <= 6:
        return "6"
    elif holes <= 9:
        return "9"
    elif holes <= 12:
        return "12"
    elif holes <= 18:
        return "18"
    elif holes <= 27:
        return "27"
    else:
        return "36"


def classify_length_class(
    holes: int,
    total_yardage: Optional[int] = None,
    par_values: Optional[List[int]] = None,
    description: Optional[str] = None
) -> str:
    """
    Classify length class based on holes, yardage, par values, and description.
    
    Returns:
        Length class key (pitch-and-putt, par-3, executive, regulation)
    """
    desc_lower = (description or "").lower()
    
    # Check description keywords first
    if "pitch" in desc_lower and "putt" in desc_lower:
        return "pitch-and-putt"
    if "par-3" in desc_lower or "par 3" in desc_lower:
        return "par-3"
    if "executive" in desc_lower:
        return "executive"
    
    # Analyze par values
    if par_values:
        if all(p == 3 for p in par_values):
            # All par-3 holes
            if total_yardage and total_yardage < 3000:
                return "pitch-and-putt"
            return "par-3"
        
        total_par = sum(par_values)
        if total_par <= 68 and total_par >= 60:
            return "executive"
    
    # Analyze yardage
    if total_yardage:
        if total_yardage < 3000:
            return "pitch-and-putt"
        elif total_yardage < 5000:
            return "executive"
    
    # Default to regulation for standard courses
    return "regulation"


def classify_access_type(
    description: Optional[str] = None,
    website_content: Optional[str] = None,
    membership_info: Optional[str] = None,
    ownership_info: Optional[str] = None
) -> str:
    """
    Classify course access type based on description and available information.
    
    Returns:
        Access type key (municipal, public, daily-fee, semi-private, private)
    """
    text = " ".join([
        description or "",
        website_content or "",
        membership_info or "",
        ownership_info or ""
    ]).lower()
    
    # Check for municipal keywords
    if any(word in text for word in ["municipal", "city-owned", "city course", "public course", "municipality"]):
        return "municipal"
    
    # Check for private keywords
    if any(word in text for word in ["private", "members only", "membership required", "exclusive", "member-only"]):
        return "private"
    
    # Check for semi-private indicators
    if any(word in text for word in ["semi-private", "semi private", "membership available", "membership options", "public and members"]):
        return "semi-private"
    
    # Check for daily-fee (public access with private ownership)
    if any(word in text for word in ["daily fee", "daily-fee", "public access", "open to public"]):
        # If it's not municipal and not private, likely daily-fee
        if "municipal" not in text and "city" not in text:
            return "daily-fee"
    
    # Default to public
    return "public"


def classify_purpose(
    description: Optional[str] = None,
    website_content: Optional[str] = None,
    course_info: Optional[str] = None
) -> Optional[str]:
    """
    Classify course purpose based on description and available information.
    
    Returns:
        Purpose type key or None if cannot be determined
    """
    text = " ".join([
        description or "",
        website_content or "",
        course_info or ""
    ]).lower()
    
    # Check for championship/tournament keywords
    if any(word in text for word in ["championship", "tournament", "pga", "us open", "masters", "major"]):
        if any(word in text for word in ["stadium", "spectator", "grandstand", "hospitality"]):
            return "stadium-tournament"
        return "championship"
    
    # Check for resort keywords
    if any(word in text for word in ["resort", "hotel", "guest", "stay and play", "vacation"]):
        return "resort"
    
    # Check for member-focused keywords
    if any(word in text for word in ["member", "membership", "club", "country club"]):
        return "member"
    
    # Check for beginner/junior keywords
    if any(word in text for word in ["junior", "youth", "kids", "children"]):
        return "junior"
    
    if any(word in text for word in ["beginner", "learning", "introductory", "new golfer"]):
        return "beginner"
    
    # Check for academy/instruction keywords
    if any(word in text for word in ["academy", "instruction", "teaching", "coaching", "school", "lessons"]):
        return "academy"
    
    return None


def classify_land_type(
    description: Optional[str] = None,
    location_info: Optional[str] = None,
    images_info: Optional[str] = None
) -> Optional[str]:
    """
    Classify land type based on description, location, and visual information.
    
    Returns:
        Land type key or None if cannot be determined
    """
    text = " ".join([
        description or "",
        location_info or "",
        images_info or ""
    ]).lower()
    
    # Links (coastal, sandy)
    if any(word in text for word in ["links", "coastal", "dunes", "sandy", "seaside", "ocean", "beach"]):
        if "inland" in text or "style" in text:
            return "links-style"
        return "links"
    
    # Parkland
    if any(word in text for word in ["parkland", "tree-lined", "trees", "lush", "manicured", "inland"]):
        return "parkland"
    
    # Heathland
    if any(word in text for word in ["heathland", "heather", "gorse", "sandy soil"]):
        return "heathland"
    
    # Moorland
    if any(word in text for word in ["moorland", "moor", "upland", "windswept", "elevation"]):
        return "moorland"
    
    # Woodland
    if any(word in text for word in ["woodland", "wooded", "forest", "dense trees", "tight"]):
        return "woodland"
    
    # Desert
    if any(word in text for word in ["desert", "arid", "cactus", "arizona", "nevada", "dunes"]):
        return "desert"
    
    # Mountain/Alpine
    if any(word in text for word in ["mountain", "alpine", "elevation change", "sloped", "hills", "peaks"]):
        return "mountain"
    
    # Coastal cliff
    if any(word in text for word in ["cliff", "headland", "bluff", "coastal cliff"]):
        return "coastal-cliff"
    
    # Tropical/Jungle
    if any(word in text for word in ["tropical", "jungle", "rainforest", "palm", "hawaii", "caribbean"]):
        return "tropical"
    
    # Wetland/Marsh
    if any(word in text for word in ["wetland", "marsh", "swamp", "water systems"]):
        return "wetland"
    
    # Volcanic
    if any(word in text for word in ["volcanic", "lava", "lava field", "volcano"]):
        return "volcanic"
    
    # Island
    if any(word in text for word in ["island", "offshore", "water-separated"]):
        return "island"
    
    # Sandbelt
    if any(word in text for word in ["sandbelt", "sand belt", "melbourne", "firm conditions", "distinct bunker"]):
        return "sandbelt"
    
    return None


def classify_design(
    description: Optional[str] = None,
    course_info: Optional[str] = None
) -> Optional[str]:
    """
    Classify design philosophy based on description.
    
    Returns:
        Design type key or None if cannot be determined
    """
    text = " ".join([
        description or "",
        course_info or ""
    ]).lower()
    
    # Penal
    if any(word in text for word in ["penal", "narrow", "punishment", "tight", "demanding"]):
        return "penal"
    
    # Strategic
    if any(word in text for word in ["strategic", "risk-reward", "options", "multiple lines", "choices"]):
        return "strategic"
    
    # Heroic
    if any(word in text for word in ["heroic", "dramatic", "bold", "carry", "challenging"]):
        return "heroic"
    
    # Target
    if any(word in text for word in ["target", "isolated", "forced carry", "landing zone"]):
        return "target"
    
    # Minimalist
    if any(word in text for word in ["minimalist", "natural", "light touch", "contours", "shaping"]):
        return "minimalist"
    
    return None


def classify_tech(
    description: Optional[str] = None,
    amenities: Optional[List[str]] = None
) -> str:
    """
    Classify technology type based on description and amenities.
    
    Returns:
        Tech type key (defaults to "none")
    """
    text = " ".join([
        description or "",
        " ".join(amenities or [])
    ]).lower()
    
    # VR
    if any(word in text for word in ["vr", "virtual reality", "virtual golf"]):
        return "vr"
    
    # Entertainment range (Topgolf-style)
    if any(word in text for word in ["topgolf", "entertainment range", "targets", "hospitality"]):
        return "entertainment-range"
    
    # Screen golf
    if any(word in text for word in ["screen golf", "simulator lounge", "golf bays"]):
        return "screen-golf"
    
    # Simulator
    if any(word in text for word in ["simulator", "indoor", "trackman", "flightscope"]):
        return "simulator"
    
    # Augmented range
    if any(word in text for word in ["augmented", "tracking", "range games", "tech range"]):
        return "augmented-range"
    
    return "none"


def classify_alternative(
    description: Optional[str] = None,
    course_info: Optional[str] = None
) -> Optional[str]:
    """
    Classify alternative golf type.
    
    Returns:
        Alternative type key or None if not alternative golf
    """
    text = " ".join([
        description or "",
        course_info or ""
    ]).lower()
    
    # Miniature golf
    if any(word in text for word in ["miniature golf", "mini golf", "putt-putt", "putting course"]):
        if any(word in text for word in ["adventure", "themed", "obstacles", "elaborate"]):
            return "adventure"
        return "miniature"
    
    # Disc golf
    if any(word in text for word in ["disc golf", "frisbee", "basket"]):
        return "disc"
    
    # Footgolf
    if any(word in text for word in ["footgolf", "soccer", "oversized cup"]):
        return "footgolf"
    
    return None


def classify_course_types(
    holes: int,
    total_yardage: Optional[int] = None,
    par_values: Optional[List[int]] = None,
    description: Optional[str] = None,
    website_content: Optional[str] = None,
    membership_info: Optional[str] = None,
    ownership_info: Optional[str] = None,
    location_info: Optional[str] = None,
    images_info: Optional[str] = None,
    amenities: Optional[List[str]] = None
) -> List[Dict[str, str]]:
    """
    Classify course types across all taxonomy groups.
    
    Returns:
        List of course type dictionaries with groupKey and typeKey
    """
    course_types = []
    
    # Always classify hole_count
    course_types.append({
        "groupKey": "hole_count",
        "typeKey": classify_hole_count(holes)
    })
    
    # Always classify length_class
    course_types.append({
        "groupKey": "length_class",
        "typeKey": classify_length_class(holes, total_yardage, par_values, description)
    })
    
    # Always classify access
    course_types.append({
        "groupKey": "access",
        "typeKey": classify_access_type(description, website_content, membership_info, ownership_info)
    })
    
    # Classify purpose (optional)
    purpose = classify_purpose(description, website_content)
    if purpose:
        course_types.append({
            "groupKey": "purpose",
            "typeKey": purpose
        })
    
    # Classify land_type (optional)
    land_type = classify_land_type(description, location_info, images_info)
    if land_type:
        course_types.append({
            "groupKey": "land_type",
            "typeKey": land_type
        })
    
    # Classify design (optional)
    design = classify_design(description)
    if design:
        course_types.append({
            "groupKey": "design",
            "typeKey": design
        })
    
    # Always classify tech (defaults to "none")
    course_types.append({
        "groupKey": "tech",
        "typeKey": classify_tech(description, amenities)
    })
    
    # Classify alternative (optional, only if alternative golf)
    alternative = classify_alternative(description)
    if alternative:
        course_types.append({
            "groupKey": "alternative",
            "typeKey": alternative
        })
    
    return course_types


def main():
    """CLI interface for course type classification."""
    if len(sys.argv) < 2:
        print("Usage: classify-course-type.py <course_data.json>")
        print("\nCourse data JSON should include:")
        print("  - holes: number of holes (required)")
        print("  - totalYardage: total course yardage (optional)")
        print("  - parValues: list of par values (optional)")
        print("  - description: course description (optional)")
        print("  - websiteContent: website content (optional)")
        print("  - membershipInfo: membership information (optional)")
        print("  - ownershipInfo: ownership information (optional)")
        print("  - locationInfo: location/geography information (optional)")
        print("  - imagesInfo: image description/analysis (optional)")
        print("  - amenities: list of amenities (optional)")
        sys.exit(1)
    
    try:
        with open(sys.argv[1], 'r') as f:
            course_data = json.load(f)
        
        course_types = classify_course_types(
            holes=course_data.get("holes", 18),
            total_yardage=course_data.get("totalYardage"),
            par_values=course_data.get("parValues"),
            description=course_data.get("description"),
            website_content=course_data.get("websiteContent"),
            membership_info=course_data.get("membershipInfo"),
            ownership_info=course_data.get("ownershipInfo"),
            location_info=course_data.get("locationInfo"),
            images_info=course_data.get("imagesInfo"),
            amenities=course_data.get("amenities")
        )
        
        print(json.dumps(course_types, indent=2))
    
    except FileNotFoundError:
        print(f"Error: File '{sys.argv[1]}' not found", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
