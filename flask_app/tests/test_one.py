from flask_app.app import return_one


class TestFlaskApp:
    def test_two(self):
        x = return_one()
        assert x == 1