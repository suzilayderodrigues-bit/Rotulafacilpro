"""Read the pinned XLSX with Python's standard library. No DB, writes or dependencies."""
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile
import xml.etree.ElementTree as ET

NAME = "EProjetosRotulafacilprobase-rotula-ampliada (2).xlsx.xlsx"
SIZE = 102469
SHA256 = "afe5c1206766ae7395acad83b401ec1c0ad3533d19aa82ac8ce4bd1b21c65b31"
HEADERS = ["ID", "Nome", "Categoria", "BaseUnit", "Base100", "DataOrigin", "SourceCode", "SourceVersion", "SourceDescription", "Status fonte", "DataOriginUrl", "CaloriesKcal", "CarbohydratesG", "ProteinsG", "TotalFatG", "SaturatedFatG", "TransFatG", "FiberG", "SodiumMg", "SugarsG", "AddedSugarsG", "CalciumMg", "IronMg", "ContainsGluten", "ContainsLactose", "Allergens", "Observations", "Priority", "SearchAliases"]
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_workbook(filename):
    source = Path(filename)
    content = source.read_bytes()
    if source.name != NAME or len(content) != SIZE or hashlib.sha256(content).hexdigest() != SHA256:
        raise ValueError("WORKBOOK_IDENTITY")
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        sheets = ET.fromstring(archive.read("xl/workbook.xml")).find("s:sheets", NS)
        if sheets is None or sheets[0].attrib["name"] != "Base Rotula Ampliada":
            raise ValueError("WORKBOOK_SHEET")
        sheet_id = sheets[0].attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = next(item.attrib["Target"] for item in relationships if item.attrib["Id"] == sheet_id)
        target = target.lstrip("/") if target.startswith("/") else "xl/" + target
        sheet = ET.fromstring(archive.read(target))
        if sheet.findall(".//s:f", NS):
            raise ValueError("WORKBOOK_FORMULA")
        rows = []
        headers = None
        for row in sheet.findall("s:sheetData/s:row", NS):
            values = [None] * len(HEADERS)
            for cell in row.findall("s:c", NS):
                letters = "".join(char for char in cell.attrib["r"] if char.isalpha())
                column = 0
                for char in letters:
                    column = column * 26 + ord(char.upper()) - ord("A") + 1
                if column > len(HEADERS):
                    raise ValueError("WORKBOOK_COLUMN")
                cell_type = cell.get("t")
                element = cell.find("s:v", NS)
                raw = element.text if element is not None else None
                if cell_type == "s":
                    value = strings[int(raw)]
                elif cell_type == "inlineStr":
                    inline = cell.find("s:is", NS)
                    value = "".join(inline.itertext()) if inline is not None else None
                elif cell_type == "b":
                    if raw not in ("0", "1"):
                        raise ValueError("WORKBOOK_BOOLEAN")
                    value = raw == "1"
                elif cell_type == "e":
                    raise ValueError("WORKBOOK_ERROR_CELL")
                else:
                    # Decode XLSX numeric cells as numbers, as in the audited reader.
                    # No decimal rounding: missing cells remain None and explicit zero remains zero.
                    value = (float(raw) if cell_type in (None, "n") else raw) if raw is not None else None
                values[column - 1] = value
            if headers is None:
                if values != HEADERS:
                    raise ValueError("WORKBOOK_HEADERS")
                headers = values
            elif any(value is not None for value in values):
                rows.append({"excelRow": int(row.attrib["r"]), "values": dict(zip(headers, values))})
        if len(rows) != 662:
            raise ValueError("WORKBOOK_ROW_COUNT")
    return {"filename": NAME, "bytes": SIZE, "sha256": SHA256, "rows": rows}


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("WORKBOOK_ARGUMENT")
        print(json.dumps(read_workbook(sys.argv[1]), ensure_ascii=True))
    except Exception:
        print("Workbook verification failed; no database access.", file=sys.stderr)
        sys.exit(1)
